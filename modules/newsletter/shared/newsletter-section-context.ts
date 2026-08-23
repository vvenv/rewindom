/**
 * 确认页 / 退订页的**按请求**数据（走 `SectionRenderContext.contributed["newsletter"]`）。
 *
 * 这两张页的段渲染器要知道「token 是什么、这次点的结果是什么、这个人订了哪些列表」，
 * 而这些按请求变，塞不进段的 settings，也不该让 marketing 认识它们的形状。
 *
 * **不登记 `registerSectionContextProvider`**：这两张页不走 CMS 页面管线，是本模块
 * 自己的 SSR 路由在渲染，`contributed` 由那条路由直接传给 `renderMarketingHtml`。
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

export interface NewsletterRenderContext {
  confirm?: NewsletterConfirmContext;
  unsubscribe?: NewsletterUnsubscribeContext;
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
