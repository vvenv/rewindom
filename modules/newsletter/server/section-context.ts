/**
 * 订阅段的按请求文案表。
 *
 * 段渲染器要在表单下面写一行「订阅范围：AI · 每天一封摘要」，而这两件事都取决于
 * **段自己的设置**——`contributed` 是页面级的，`SectionContextInput` 里没有某一段的
 * settings，渲染器又拿不到 i18n。所以这里按 key 备好整张表，段按自己选的
 * `list_key` / `cadence` 查。
 *
 * 两条渲染路径共用这一份：本模块自己的 `/subscribe` 路由，以及订阅段被摆到任意
 * CMS 页面上时的 `registerSectionContextProvider`。
 */
import { listAvailableLists } from "./subscriber.service.js";

import { findNewsletterSource } from "../shared/newsletter-source.js";

import { DIGEST_CADENCES, NEWSLETTER_ALL_LISTS } from "../shared/newsletter.js";

import {
  normalizeLocale,
  translateServerMessage,
  type AppLocale,
} from "@rewindom/module-sdk/server";

import type {
  NewsletterSectionLabels,
  NewsletterSubscribeScope,
} from "../shared/newsletter-section-context.js";

/** 「订阅范围：AI」。整句由服务端拼好——渲染器没有 i18n，也不该自己拼中英文的冒号。 */
function scopeLine(locale: AppLocale, list: string): string {
  return translateServerMessage(locale, {
    code: "newsletter.scope.line",
    params: { list },
  });
}

export async function buildNewsletterSectionLabels(input: {
  tenant_id: string;
  locale: string;
}): Promise<NewsletterSectionLabels> {
  const locale = normalizeLocale(input.locale);
  const scopes: Record<string, string> = {
    [NEWSLETTER_ALL_LISTS]: scopeLine(
      locale,
      translateServerMessage(locale, { code: "newsletter.scope.all" }),
    ),
  };

  /*
   * 候选清单就是租户在下拉里能选到的那些——段里存的 key 一定在其中。
   * 拉不动就少这一行，表单照常可用：订阅入口不该因为一个内容源出问题而消失。
   */
  try {
    const lists = await listAvailableLists({
      tenant_id: input.tenant_id,
      locale,
    });
    for (const list of lists) {
      scopes[list.list_key] = scopeLine(locale, list.label);
    }
  } catch {
    // 只影响那一行说明
  }

  const cadences: Record<string, string> = {};
  for (const cadence of DIGEST_CADENCES) {
    cadences[cadence] = translateServerMessage(locale, {
      code: `newsletter.cadence.${cadence}`,
    });
  }

  return { scopes, cadences };
}

/**
 * `?list=` 指定的订阅范围。
 *
 * **必须校验**：这是访客能随便写的参数。认不出的 key 一律当没传——而不是原样塞进
 * 表单，让他订上一个永远不会有内容的列表。
 *
 * newsletter **不认识 topic / entity 是什么**，只问「有没有内容源认领这个 key」。
 */
export async function resolveSubscribeScope(
  tenantId: string,
  locale: string,
  requested: string,
): Promise<NewsletterSubscribeScope | undefined> {
  const source = requested ? findNewsletterSource(requested) : null;
  if (!source) return undefined;

  /*
   * 名字问源要，不是从候选清单里找——实体列表刻意不进清单（几千个），
   * 但 `/subscribe?list=events:entity:openai` 照样得告诉读者他在订 OpenAI。
   */
  let label: string | null = null;
  try {
    label = await source.describeList({
      tenant_id: tenantId,
      list_key: requested,
      locale,
    });
  } catch {
    // 源查不动就当没名字；范围仍然生效，只是少一行说明
  }
  if (!label) return { list_key: requested, scope_label: "" };

  return {
    list_key: requested,
    // 与段设置里选中的那一档同一条文案，两种来源在页面上长得一样
    scope_label: translateServerMessage(normalizeLocale(locale), {
      code: "newsletter.scope.line",
      params: { list: label },
    }),
  };
}

/**
 * 订阅段在**任意页面**上要的那一份上下文。
 *
 * 两件事：这一段订的是什么、多久一封（文案表），以及 `?list=` 指定的范围。
 * 后者以前只有本模块的 `/subscribe` 路由认——于是同一张订阅页，从
 * `/subscribe?list=events:topic:ai` 打开显示「AI」，从 `/zh-CN/subscribe?list=...`
 * 打开却显示「本站全部更新」：带语言前缀的那条走的是 marketing 的通用管线，
 * 根本没人读那个参数。**范围属于请求，不属于哪条路由**，所以收在这里。
 */
export async function buildNewsletterSectionContext(input: {
  tenant_id: string;
  locale: string;
  requested_list?: unknown;
}): Promise<{
  labels: NewsletterSectionLabels;
  subscribe?: NewsletterSubscribeScope;
}> {
  const requested =
    typeof input.requested_list === "string" ? input.requested_list.trim() : "";
  const [labels, subscribe] = await Promise.all([
    buildNewsletterSectionLabels(input),
    resolveSubscribeScope(input.tenant_id, input.locale, requested),
  ]);
  return { labels, ...(subscribe ? { subscribe } : {}) };
}
