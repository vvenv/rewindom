/**
 * 模块自有 SSR 页的 `contributed` —— 与通用管线同一套「收集 + 跑 provider + 合并」。
 *
 * 背景：`ssr.routes.ts` 的 `renderLogicalPath` 在渲染前会把页头、页脚、正文用到的段
 * type 收齐，跑用得上的 provider，再把结果合进 `contributed`。而自己挂 Fastify 路由
 * 或自己接 path handler 的那些页（店面、文档库、会员三张、订阅三张）是各自调
 * `renderMarketingHtml` 的，以前只传自己那一份——**页头页脚上的贡献块因此全部拿不到
 * 数据、各自退回兜底**。events 的主题格兜底是「七格全显示」，于是 `/subscribe` 的页头
 * 挂着租户早就关掉的主题，而同一张页的 `/zh-CN/subscribe`（落到通用管线）只挂启用的
 * 那几格——同一张页两个样子。**贡献上下文属于「这张页面摆了哪些段」，不属于哪条路由。**
 *
 * 为什么不干脆把 contributed 塞进 `SitePathHandlerInput`：provider 要按本页实际摆了
 * 哪些段决定跑不跑，而版式（模板页或预设兜底）只有 handler 自己知道——marketing 在调
 * handler 的那一刻还没有 sections。
 */

import { resolveSectionContexts } from "./section-context-providers.js";

import { mergeContributedRecords } from "../shared/site-interpolation.js";
import { collectSectionTypes } from "../shared/sections/collect-types.js";

import type { SiteSection } from "../shared/sections/types.js";
import type { AppLocale } from "@rewindom/shared";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 渲染方自己那份**盖在** provider 那份之上，但只盖一层。
 *
 * 整键替换（`mergeContributedRecords` 的口径）在这里是错的：确认页自己给的是
 * 「这次点的结果」，同一张页上摆着的订阅段要的是 provider 算的文案表，两者同属
 * `contributed.newsletter` 却是两件事。整键盖掉就把页头 / 同页别的段又打回兜底。
 */
function overlayOwn(
  base: Record<string, unknown>,
  own: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(own)) {
    const previous = base[key];
    out[key] =
      isRecord(previous) && isRecord(value) ? { ...previous, ...value } : value;
  }
  return out;
}

export interface PageContributedInput {
  tenantId: string;
  locale: AppLocale;
  defaultLocale: AppLocale;
  /** 页头页脚从这里取；只用 `header` / `footer` 两个字段。 */
  site: { header: SiteSection[]; footer: SiteSection[] };
  /** 本页正文的段（模板页快照或预设兜底，取决于渲染方）。 */
  sections: readonly SiteSection[];
  /**
   * 渲染方自己的按请求数据，按模块 id 分键（`newsletterContextEntry(...)` 那种）。
   * 与 provider 那份**键内合并**，同名字段以这份为准。
   */
  own?: Record<string, unknown>;
  /**
   * 渲染方**已经自己查好**的那些段 type，不要再让 provider 查一遍：店面页手里已经
   * 有完整购物车与商品，文档页已经有 docs，事件页已经有 feed。
   * 反过来，订阅段刻意不跳过——那份文案表以 provider 为唯一来源。
   */
  skipSectionTypes?: readonly string[];
  cookies?: { get(name: string): string | undefined };
  query?: Readonly<Record<string, unknown>>;
  /** 已登录会员；访客不传。页头上绑到会员的块（购物车）按它查。 */
  memberId?: string | null;
  /** 有就传（path handler 的输入里本来就有）；没有的自己 `resolveVisitorHomePath`。 */
  homePath?: string;
  homeLayoutKey?: string;
}

export async function resolvePageContributed(
  input: PageContributedInput,
): Promise<Record<string, unknown>> {
  const usedSectionTypes = collectSectionTypes(input.site.header);
  collectSectionTypes(input.site.footer, usedSectionTypes);
  collectSectionTypes(input.sections, usedSectionTypes);
  for (const type of input.skipSectionTypes ?? []) {
    usedSectionTypes.delete(type);
  }

  /* 单个 provider 失败由 `resolveSectionContexts` 自己吞掉：页头少一块，
   * 好过整张页 500——这几张页里有退订页，读者退不掉订阅只会去点「举报垃圾邮件」。 */
  const fromProviders =
    (await resolveSectionContexts({
      tenantId: input.tenantId,
      locale: input.locale,
      defaultLocale: input.defaultLocale,
      usedSectionTypes,
      cookies: input.cookies,
      query: input.query,
      memberId: input.memberId,
      homePath: input.homePath,
      homeLayoutKey: input.homeLayoutKey,
    })) ?? {};

  if (!input.own) return fromProviders;
  return mergeContributedRecords([
    fromProviders,
    overlayOwn(fromProviders, input.own),
  ]);
}
