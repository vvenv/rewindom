/**
 * 「今天那条」的按请求数据（走 `SectionRenderContext.contributed["useless"]`）。
 *
 * 段渲染器是同步的，句子要查库，所以从 contributed 进。两端各登记一个 provider：
 * SSR 的在 `server/sections/register.ts`，编辑器预览的在 `client/editor-context.ts`。
 * 只登记一边的后果是「预览空白」或「实站不渲染」。
 */
import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const USELESS_CONTEXT_KEY = "useless";

export interface UselessTodayView {
  /** 今天那条的正文。池子空时整个 today 为 null。 */
  text: string;
}

export interface UselessRenderContext {
  /** null = 池子里还没有启用的句子。这是正常状态，不是错误。 */
  today: UselessTodayView | null;
}

export function uselessContextEntry(
  context: UselessRenderContext,
): Record<string, unknown> {
  return { [USELESS_CONTEXT_KEY]: context };
}

export function readUselessContext(input: {
  contributed?: SectionRenderContext["contributed"];
}): UselessRenderContext | null {
  const value = input.contributed?.[USELESS_CONTEXT_KEY];
  if (!value || typeof value !== "object") return null;
  return value as UselessRenderContext;
}
