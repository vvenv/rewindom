/**
 * 确认页 / 退订页的**按请求**数据（走 `SectionRenderContext.contributed["newsletter"]`）。
 *
 * 这两张页的段渲染器要知道「token 是什么、这次点的结果是什么、这个人订了哪些列表」，
 * 而这些按请求变，塞不进段的 settings，也不该让 marketing 认识它们的形状。
 *
 * **这一份没有 provider**：token 与「这次点的结果」只有本模块那条 SSR 路由知道，
 * `SectionContextInput` 里没有这些东西。路由把它合进 `contributed` 再交给
 * `renderMarketingHtml`（见 `server/newsletter.ssr.ts` 的 `resolvePanelContributed`）。
 * 注意合并是**键内合并**——同一张页上摆着订阅段时，provider 算的那份文案表要留着。
 * 编辑器预览拿不到上下文——渲染器把 `undefined` 当成「表单态」，那正是预览该显示的
 * 样子，所以也不需要 `registerEditorContextProvider`。
 */
import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const NEWSLETTER_CONTEXT_KEY = "newsletter";

/**
 * `form` = 还没点按钮（GET）；`ok` = 成功；`invalid` = token 失效或不存在。
 *
 * 失效与不存在**必须是同一个状态**：分开说等于告诉探测者「这个 token 曾经存在过」。
 */
export type NewsletterPanelResult = "form" | "ok" | "invalid";

export interface NewsletterConfirmContext {
  result: NewsletterPanelResult;
  token: string;
  action: string;
}

export interface NewsletterUnsubscribeContext {
  result: NewsletterPanelResult;
  token: string;
  action: string;
  /** 掩码后的地址，给读者确认「退的是这个邮箱」；不回全址。 */
  email: string;
  lists: string[];
}

/**
 * 订阅页按 URL 指定的订阅范围（`/subscribe?list=events:topic:ai`）。
 *
 * **newsletter 不认识 topic / entity 是什么**——它只把 `list_key` 透传下去，
 * 由内容源认领。`scope_label` 是已经落成当前语言的成品文案（段渲染器拿不到 i18n）。
 */
export interface NewsletterSubscribeScope {
  list_key: string;
  /** 「订阅范围：AI」这种整句，直接渲染。解不出名字时为空串。 */
  scope_label: string;
}

/**
 * 段自己要拼的那一行说明所需的**成品文案表**。
 *
 * 为什么是表而不是一句话：这一行的内容取决于**段自己的设置**（订哪张表、多久一封），
 * 而 `contributed` 是页面级的、拿不到某一段的 settings（见
 * `SectionContextInput`）；渲染器又拿不到 i18n。所以两端各给一张按 key 取的表，
 * 段按自己的 `list_key` / `cadence` 查。
 *
 * 一张页上摆两个订阅段、各订不同的东西时，这个形状照样是对的。
 */
export interface NewsletterSectionLabels {
  /** `list_key` → 「订阅范围：AI」整句。含 `newsletter.all` 那一条。 */
  scopes: Record<string, string>;
  /** `cadence` → 「每天一封摘要」。 */
  cadences: Record<string, string>;
}

export interface NewsletterRenderContext {
  /** 只在订阅页上有：URL 指定了范围时覆盖段设置里的 list_key。 */
  subscribe?: NewsletterSubscribeScope;
  confirm?: NewsletterConfirmContext;
  unsubscribe?: NewsletterUnsubscribeContext;
  /**
   * 订阅段要显示的成品文案（订的是什么、多久一封）。
   *
   * 读者必须看得见这两件事：周期是**租户在段上定的**，读者没有地方选，那就得告诉他
   * 定的是什么；范围不写出来，从主题页点过来的读者会以为自己订了全站。
   */
  labels?: NewsletterSectionLabels;
  /**
   * 本站可订阅列表。**只给编辑器的下拉用**——实站渲染不需要它（段里存的就是选中的
   * key），所以 SSR 那边不填这一项。
   */
  lists?: { list_key: string; label: string }[];
}

export function newsletterContextEntry(
  context: NewsletterRenderContext,
): Record<string, unknown> {
  return { [NEWSLETTER_CONTEXT_KEY]: context };
}

export function readNewsletterContext(input: {
  contributed?: SectionRenderContext["contributed"];
}): NewsletterRenderContext | null {
  const value = input.contributed?.[NEWSLETTER_CONTEXT_KEY];
  if (!value || typeof value !== "object") return null;
  return value as NewsletterRenderContext;
}
