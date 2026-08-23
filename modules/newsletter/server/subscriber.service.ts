/**
 * 订阅关系的写入面：订阅、确认、退订。
 *
 * 三条硬口径（论证见 MODULE.spec.yaml 的设计要点）：
 *
 * 1. **公开口一律回同一个结果**，不区分「新订阅」和「这个地址早就订过了」。否则这个
 *    接口就是一个邮箱枚举器：谁都能拿它验证某个地址是不是本站订阅者。
 * 2. **副作用只发生在 POST**。邮件客户端与企业安全网关会替用户预取邮件里的链接，
 *    GET 就落确认的话，扫描器点一遍等于用户确认了；退订更糟，图片代理能把名单退光。
 *    本文件只提供 `confirm*` / `unsubscribe*` 函数，是否只在 POST 调由路由保证。
 * 3. **发信能力不可用时直接拒**。收了邮箱却永远发不出确认信，比没有这个表单更糟。
 */
import { randomBytes } from "node:crypto";

import {
  NEWSLETTER_ALL_LISTS,
  findNewsletterSource,
  listNewsletterSources,
  type DigestCadence,
} from "../shared/index.js";

import { buildConfirmMail } from "./mail-templates.js";
import { resolveSiteOrigin } from "./site-origin.js";

import { AppError, prisma, withTenantScope } from "@rewindom/module-sdk/server";

import type { NewsletterList } from "../shared/index.js";
import type { FastifyInstance } from "fastify";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
/** 确认链接的有效期。太短会让「晚上收信、第二天点」失败，太长则 token 白挂着。 */
const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 进程内滑动窗口限流，与 site-form 同一条口径与同样的边界：**按进程计**，
 * 多实例各有一份配额，重启即清零。它挡的是脚本猛灌，不是分布式刷量——
 * 那要 Redis 或网关层，等真出现再上。
 */
const hits = new Map<string, number[]>();

function rateLimited(key: string, now: number): boolean {
  const window = (hits.get(key) ?? []).filter(
    (at) => now - at < RATE_WINDOW_MS,
  );
  if (window.length >= RATE_LIMIT) {
    hits.set(key, window);
    return true;
  }
  window.push(now);
  hits.set(key, window);
  if (hits.size > 5000) {
    for (const [entry, times] of hits) {
      if (times.every((at) => now - at >= RATE_WINDOW_MS)) hits.delete(entry);
    }
  }
  return false;
}

/** 仅供测试：把限流窗口清空。 */
export function resetNewsletterRateLimit(): void {
  hits.clear();
}

function newToken(): string {
  return randomBytes(32).toString("hex");
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** 判据是「这封信发不发得到」，不是正则写得多细。 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  return email.length <= 254 && EMAIL_RE.test(email);
}

/** 本站所有可订阅列表（合并全部内容源）。 */
export async function listAvailableLists(input: {
  tenant_id: string;
  locale: string;
}): Promise<NewsletterList[]> {
  const all: NewsletterList[] = [];
  for (const source of listNewsletterSources()) {
    try {
      const lists = await source.listLists(input);
      // 回填来源：贡献方不用管，但下拉要靠它判断「这个站有几个源」
      all.push(...lists.map((list) => ({ source_id: source.id, ...list })));
    } catch {
      // 一个内容源出问题不该让整个订阅入口消失——少一组候选，其余照常
      continue;
    }
  }
  return all;
}

/**
 * 把请求里的 list_key 解析成真正要订的列表。
 *
 * `newsletter:all`（或空串，存量数据）= 本站全部可订阅列表。
 * 其余 key 必须有内容源认领，否则拒——不然读者会订上一个永远不会有内容的列表。
 */
export async function resolveListKeys(input: {
  tenant_id: string;
  locale: string;
  requested: string[];
}): Promise<string[]> {
  const requested = input.requested
    .map((key) => key.trim())
    .filter((key) => key && key !== NEWSLETTER_ALL_LISTS);
  // 空串与 `newsletter:all` 同义：前者是下拉之前存量段里的写法
  if (requested.length === 0) {
    const lists = await listAvailableLists(input);
    // 动态候选（含 `{token}`）没有页面上下文就解不开，不能混进「全部」
    return lists
      .filter((list) => !list.dynamic && !list.list_key.includes("{"))
      .map((list) => list.list_key);
  }
  const unknown = requested.filter((key) => !findNewsletterSource(key));
  if (unknown.length > 0) {
    throw new AppError({ code: "newsletter.list_unknown", status: 400 });
  }
  return Array.from(new Set(requested));
}

export interface SubscribeInput {
  tenant_id: string;
  email: string;
  locale: string;
  list_keys: string[];
  cadence: DigestCadence;
  source_path: string | null;
  ip: string;
  user_agent: string;
  app: FastifyInstance;
}

/**
 * 订阅（或续订）。
 *
 * 返回值刻意**不区分**新老订阅者：调用方一律回同一个 202。
 */
export async function subscribe(input: SubscribeInput): Promise<void> {
  const now = Date.now();
  if (rateLimited(`${input.tenant_id}:${input.ip}`, now)) {
    throw new AppError({ code: "newsletter.rate_limited", status: 429 });
  }

  const mail = input.app.registry.getMailProvider();
  if (!mail || !(await mail.isConfigured(input.tenant_id))) {
    // 没有发信能力就别收邮箱：收下却发不出确认信，读者永远等不到那封信
    throw new AppError({ code: "newsletter.mail_unavailable", status: 503 });
  }

  const email = normalizeEmail(input.email);
  const listKeys = await resolveListKeys({
    tenant_id: input.tenant_id,
    locale: input.locale,
    requested: input.list_keys,
  });
  if (listKeys.length === 0) {
    throw new AppError({ code: "newsletter.no_lists", status: 400 });
  }

  const existing = await prisma.newsletterSubscriber.findFirst({
    where: withTenantScope(input.tenant_id, { email }),
  });

  const confirmToken = newToken();
  const subscriber = existing
    ? await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          locale: input.locale,
          /*
           * 已确认的地址**保持 confirmed**，只补订阅列表——再把它打回 pending，
           * 等于因为一次重复提交就让一个正常订阅者停收，直到他再点一次确认信。
           */
          status: existing.status === "confirmed" ? "confirmed" : "pending",
          ...(existing.status === "confirmed"
            ? {}
            : {
                confirm_token: confirmToken,
                confirm_token_expires_at: new Date(now + CONFIRM_TTL_MS),
              }),
          unsubscribed_at: null,
        },
      })
    : await prisma.newsletterSubscriber.create({
        data: {
          tenant_id: input.tenant_id,
          email,
          locale: input.locale,
          status: "pending",
          confirm_token: confirmToken,
          confirm_token_expires_at: new Date(now + CONFIRM_TTL_MS),
          unsubscribe_token: newToken(),
          source_path: input.source_path,
          ip: input.ip,
          user_agent: input.user_agent,
        },
      });

  for (const listKey of listKeys) {
    await prisma.newsletterSubscription.upsert({
      where: {
        tenant_id_subscriber_id_list_key: {
          tenant_id: input.tenant_id,
          subscriber_id: subscriber.id,
          list_key: listKey,
        },
      },
      create: {
        tenant_id: input.tenant_id,
        subscriber_id: subscriber.id,
        list_key: listKey,
        cadence: input.cadence,
      },
      update: { cadence: input.cadence },
    });
  }

  const alreadyConfirmed = subscriber.status === "confirmed";
  const origin = await resolveSiteOrigin(input.tenant_id);
  if (!origin) {
    // 宁可不发，也不要发出一封链接点不开的信——读者点了没反应只会去举报垃圾邮件
    throw new AppError({ code: "newsletter.site_origin_missing", status: 503 });
  }
  const mailContent = buildConfirmMail({
    locale: input.locale,
    already_confirmed: alreadyConfirmed,
    confirm_token: alreadyConfirmed ? null : confirmToken,
    unsubscribe_token: subscriber.unsubscribe_token,
    site_origin: origin,
  });

  await mail.send({
    tenant_id: input.tenant_id,
    to: email,
    subject: mailContent.subject,
    html: mailContent.html,
    text: mailContent.text,
    source: "newsletter.confirm",
    /*
     * 幂等键带 token：同一封确认信只发一次，但重新订阅（换了 token）应当能再发一封。
     * 已确认的地址用 subscriber.id + 日期，避免有人反复提交刷出一堆「你已订阅」。
     */
    idempotency_key: alreadyConfirmed
      ? `newsletter.confirm:already:${subscriber.id}:${new Date().toISOString().slice(0, 10)}`
      : `newsletter.confirm:${subscriber.id}:${confirmToken.slice(0, 16)}`,
    headers: mailContent.headers,
  });
}

/** 确认订阅。**只应由 POST 调用**（理由见文件头）。 */
export async function confirmSubscription(
  tenantId: string,
  token: string,
): Promise<boolean> {
  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: withTenantScope(tenantId, { confirm_token: token }),
  });
  if (!subscriber) return false;
  if (
    subscriber.confirm_token_expires_at &&
    subscriber.confirm_token_expires_at.getTime() < Date.now()
  ) {
    return false;
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      status: "confirmed",
      confirmed_at: new Date(),
      // 一次性：确认后立刻作废，重放同一个链接不再生效
      confirm_token: null,
      confirm_token_expires_at: null,
    },
  });
  return true;
}

export interface UnsubscribeTarget {
  subscriber_id: string;
  email: string;
  lists: string[];
}

/** 按退订 token 找人。退订页 GET 用它渲染「你订了哪些」。 */
export async function findByUnsubscribeToken(
  token: string,
): Promise<{ tenant_id: string; target: UnsubscribeTarget } | null> {
  /*
   * 退订 token 全局唯一（`@@unique`），所以这里**不带租户过滤**：点退订链接的人
   * 没有会话、也不一定落在正确的 Host 上，要求他先猜对租户是荒谬的。
   * token 本身就是凭证，32 字节随机量。
   */
  // eslint-disable-next-line tenant-scope/require-tenant-scope -- 退订 token 全局唯一且即是凭证；读者点链接时没有租户上下文
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { unsubscribe_token: token },
    include: { subscriptions: true },
  });
  if (!subscriber) return null;
  return {
    tenant_id: subscriber.tenant_id,
    target: {
      subscriber_id: subscriber.id,
      email: subscriber.email,
      lists: subscriber.subscriptions.map((row) => row.list_key),
    },
  };
}

/**
 * 退订。**只应由 POST 调用**。
 *
 * `listKeys` 为空 = 全退：删掉全部订阅关系并把人标成 unsubscribed。
 * 给了 key 则只退那几个；退完还剩订阅的话人仍是 confirmed。
 */
export async function unsubscribe(
  token: string,
  listKeys: string[],
): Promise<boolean> {
  const found = await findByUnsubscribeToken(token);
  if (!found) return false;
  const { tenant_id, target } = found;

  if (listKeys.length > 0) {
    await prisma.newsletterSubscription.deleteMany({
      where: withTenantScope(tenant_id, {
        subscriber_id: target.subscriber_id,
        list_key: { in: listKeys },
      }),
    });
    const remaining = await prisma.newsletterSubscription.count({
      where: withTenantScope(tenant_id, {
        subscriber_id: target.subscriber_id,
      }),
    });
    if (remaining > 0) return true;
  } else {
    await prisma.newsletterSubscription.deleteMany({
      where: withTenantScope(tenant_id, {
        subscriber_id: target.subscriber_id,
      }),
    });
  }

  await prisma.newsletterSubscriber.updateMany({
    where: withTenantScope(tenant_id, { id: target.subscriber_id }),
    data: {
      status: "unsubscribed",
      unsubscribed_at: new Date(),
      /*
       * **不清 unsubscribe_token**：读者可能翻出更早的一封摘要再点一次退订，
       * 那时候链接必须仍然打得开（哪怕只是告诉他「已经退过了」）。
       */
    },
  });
  return true;
}
