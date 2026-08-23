/**
 * 摘要投递：按 `(list_key, cadence)` 一次组装、多份投递。
 *
 * **游标而不是时间窗。** 「现在减去七天」在进程重启、任务漏跑、时钟漂移下都会算错，
 * 少发或重发；游标不会——它记的是「上一轮取到哪条为止」。
 *
 * **一次组装、多份投递。** 同一组订阅者收到的正文相同，只有退订链接不同。
 * 幂等键取 `newsletter.digest:{run_id}:{cursor}:{subscriber_id}`，
 * 任务重跑、进程重启、多进程部署都不会重发（真正拦重的是 mailer 那侧的唯一索引）。
 */
import { findNewsletterSource, isDigestCadence } from "../shared/index.js";

import { buildDigestMail } from "./mail-templates.js";
import { resolveSiteOrigin } from "./site-origin.js";

import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import type { DigestCadence, NewsletterItem } from "../shared/index.js";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";

/**
 * 到期判据比周期本身**略松**：定时器每小时醒一次，卡着 24h / 7d 整判会因为
 * 几分钟的漂移把整整一轮推迟到下一次唤醒。20h / 6.5d 保证「每天一封」真的是每天。
 */
const DUE_AFTER_MS: Record<DigestCadence, number> = {
  daily: 20 * 60 * 60 * 1000,
  weekly: 6.5 * 24 * 60 * 60 * 1000,
};

/** 一封摘要最多装多少条：一个沉寂三个月的列表突然被拉一次，不能把三个月全灌进去。 */
const MAX_ITEMS = 30;

interface Group {
  tenant_id: string;
  list_key: string;
  cadence: DigestCadence;
}

export interface DigestSummary {
  groups: number;
  sent: number;
  skipped: number;
}

/** 有确认订阅者的 (租户, 列表, 周期) 组合。 */
async function activeGroups(): Promise<Group[]> {
  // eslint-disable-next-line tenant-scope/require-tenant-scope -- 后台任务服务全部租户；下面每一步都按 group.tenant_id 收窄
  const rows = await prisma.newsletterSubscription.groupBy({
    by: ["tenant_id", "list_key", "cadence"],
    where: { subscriber: { status: "confirmed" } },
  });
  return rows
    .filter((row) => isDigestCadence(row.cadence))
    .map((row) => ({
      tenant_id: row.tenant_id,
      list_key: row.list_key,
      cadence: row.cadence as DigestCadence,
    }));
}

function isDue(lastRunAt: Date | null, cadence: DigestCadence): boolean {
  if (!lastRunAt) return true;
  return Date.now() - lastRunAt.getTime() >= DUE_AFTER_MS[cadence];
}

/**
 * 取数用哪种语言。
 *
 * 只取**一次**：条目标题是数据，不翻译（与 events 的 RSS 同一条口径），
 * 所以多语言订阅者拿到的内容本来就一样，差别只在链接的语言前缀与邮件外壳文案——
 * 外壳按每个订阅者自己的 locale 渲染，链接则统一用这一组里占多数的那种语言。
 * 「按语言分别取数」记在 MODULE.spec 的 out_of_scope。
 */
function majorityLocale(locales: string[]): string {
  const counts = new Map<string, number>();
  for (const locale of locales) {
    counts.set(locale, (counts.get(locale) ?? 0) + 1);
  }
  return (
    [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0] ?? "zh-CN"
  );
}

async function runGroup(
  group: Group,
  app: FastifyInstance,
  log: FastifyBaseLogger,
): Promise<"sent" | "skipped"> {
  const run = await prisma.newsletterDigestRun.upsert({
    where: {
      tenant_id_list_key_cadence: {
        tenant_id: group.tenant_id,
        list_key: group.list_key,
        cadence: group.cadence,
      },
    },
    create: { ...group },
    update: {},
  });
  if (!isDue(run.last_run_at, group.cadence)) return "skipped";

  const source = findNewsletterSource(group.list_key);
  if (!source) {
    // 列表被下线了（贡献方停用或改了 key）。不动游标，等它回来
    log.warn(
      { list_key: group.list_key },
      "[newsletter] 没有内容源认领这个列表",
    );
    return "skipped";
  }

  const mail = app.registry.getMailProvider();
  if (!mail || !(await mail.isConfigured(group.tenant_id))) return "skipped";

  const subscribers = await prisma.newsletterSubscription.findMany({
    where: withTenantScope(group.tenant_id, {
      list_key: group.list_key,
      cadence: group.cadence,
      subscriber: { status: "confirmed" },
    }),
    select: {
      subscriber: {
        select: {
          id: true,
          email: true,
          locale: true,
          unsubscribe_token: true,
        },
      },
    },
  });
  if (subscribers.length === 0) return "skipped";

  const locale = majorityLocale(
    subscribers.map((row) => row.subscriber.locale),
  );

  let items: NewsletterItem[] = [];
  let nextCursor: string | null = run.cursor;
  try {
    const result = await source.listItemsSince({
      tenant_id: group.tenant_id,
      list_key: group.list_key,
      locale,
      cursor: run.cursor,
      limit: MAX_ITEMS,
    });
    items = result.items.slice(0, MAX_ITEMS);
    nextCursor = result.next_cursor;
  } catch (err) {
    log.error({ err, list_key: group.list_key }, "[newsletter] 取内容失败");
    return "skipped";
  }

  if (items.length === 0) {
    /*
     * 没有新内容就**不发空信**，但要推进 last_run_at——否则每小时都会重来一次，
     * 白问一遍内容源。游标不动：本来就没取到东西。
     */
    await prisma.newsletterDigestRun.update({
      where: { id: run.id },
      data: { last_run_at: new Date() },
    });
    return "skipped";
  }

  const origin = await resolveSiteOrigin(group.tenant_id);
  if (!origin) return "skipped";

  const lists = await source.listLists({ tenant_id: group.tenant_id, locale });
  const label =
    lists.find((list) => list.list_key === group.list_key)?.label ??
    group.list_key;

  /*
   * 相对路径在这里绝对化：内容源只保证语言前缀正确，站点 origin 是本模块的事。
   * 已经是绝对地址的原样放行（贡献方指向站外时会用到）。
   */
  const absoluteItems = items.map((item) => ({
    ...item,
    url: item.url.startsWith("/") ? `${origin}${item.url}` : item.url,
  }));

  const cursorTag = nextCursor ?? String(items.length);
  let delivered = 0;
  for (const row of subscribers) {
    const subscriber = row.subscriber;
    const content = buildDigestMail({
      locale: subscriber.locale,
      list_label: label,
      items: absoluteItems,
      unsubscribe_token: subscriber.unsubscribe_token,
      site_origin: origin,
    });
    try {
      await mail.send({
        tenant_id: group.tenant_id,
        to: subscriber.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        source: "newsletter.digest",
        idempotency_key: `newsletter.digest:${run.id}:${cursorTag}:${subscriber.id}`,
        headers: content.headers,
      });
      delivered += 1;
    } catch (err) {
      // 一个收件人失败不该让整轮停下——mailer 那侧已经落了投递记录并会重试
      log.warn({ err, subscriber: subscriber.id }, "[newsletter] 投递失败");
    }
  }

  /*
   * 游标与统计一起推进。放在投递之后：先推游标再投递的话，一次崩溃就会让这批内容
   * 永远发不出去——宁可重发（幂等键会拦），不可漏发。
   */
  await prisma.newsletterDigestRun.update({
    where: { id: run.id },
    data: {
      cursor: nextCursor,
      last_run_at: new Date(),
      item_count: items.length,
      recipient_count: delivered,
    },
  });
  return "sent";
}

export async function runDigests(
  app: FastifyInstance,
  log: FastifyBaseLogger,
): Promise<DigestSummary> {
  const groups = await activeGroups();
  let sent = 0;
  let skipped = 0;
  for (const group of groups) {
    try {
      const outcome = await runGroup(group, app, log);
      if (outcome === "sent") sent += 1;
      else skipped += 1;
    } catch (err) {
      log.error({ err, ...group }, "[newsletter] 摘要投递失败");
      skipped += 1;
    }
  }
  return { groups: groups.length, sent, skipped };
}
