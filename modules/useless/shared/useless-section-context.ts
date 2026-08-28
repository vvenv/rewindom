/**
 * 「那天那个」的按请求数据（走 `SectionRenderContext.contributed["useless"]`）。
 *
 * 段渲染器是同步的，东西要查库，所以从 contributed 进。两端各登记一个 provider：
 * SSR 的在 `server/sections/register.ts`，编辑器预览的在 `client/editor-context.ts`。
 * 只登记一边的后果是「预览空白」或「实站不渲染」。
 */
import type { ThingKind } from "./thing.js";

import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const USELESS_CONTEXT_KEY = "useless";

export interface UselessThingView {
  kind: ThingKind;
  title: string;
  /** kind=text 的正文。 */
  text: string;
  /** kind=embed 的 HTML。**只允许进沙箱 iframe 的 srcdoc**，不得直接注入页面。 */
  html: string;
}

/**
 * 已经落成当前语言的**成品文案**。
 *
 * 渲染器是同步的、拿不到 i18n，所以这些字由服务端 provider 按 `input.locale` 解好
 * 再送进来——与 newsletter 的 `NewsletterSectionLabels` 同一条口径。
 *
 * 曾经把它们做成段的 setting（`default: "useless:nav.prev"`），结果是编辑器
 * 「添加区块」那条路径不展开 `ns:key`，访客直接看到 `useless:nav.prev` 原文。
 */
export interface UselessLabels {
  prev: string;
  next: string;
  today: string;
  pick: string;
  /** 那天没有东西时的库存句；租户在段里填了 `empty_text` 就用租户的。 */
  empty: string;
}

export interface UselessRenderContext {
  /** 正在看的那一天，`YYYY-MM-DD`。 */
  date: string;
  /** 那天是不是今天——决定要不要显示「回到今天」。 */
  is_today: boolean;
  /** null = 那天没有东西。正常状态，不是错误。 */
  thing: UselessThingView | null;
  /** 相邻的、真的有东西的那一天；没有则为 null（按钮置灰）。 */
  prev: string | null;
  next: string | null;
  /** 日期选择器的 min / max。 */
  earliest: string | null;
  latest: string | null;
  labels: UselessLabels;
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

/** 回看地址：`/20260827`。与 path handler 的匹配规则同一处口径。 */
export function dayPath(dateKey: string): string {
  return `/${dateKey.replace(/-/g, "")}`;
}

/** `/20260827` → `2026-08-27`；不是这个形状返回 null。 */
export function dayPathToDateKey(path: string): string | null {
  const m = /^\/(\d{4})(\d{2})(\d{2})$/.exec(path);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
