/**
 * SSR 段渲染的聚合层：type → 渲染器的一张表，外加统一的外层色块。
 *
 * 以前这里是一个 `switch`，各段的 HTML 全挤在 `server/ssr-sections.ts` 里、与它们的
 * schema 隔着一整个文件。现在一段的 schema 与它的两端渲染在同一个目录下，
 * 改一处漏另一处在 diff 里是看得见的。
 *
 * 只有服务端 import 本文件：客户端要的是 `sections/index.js` 的 schema，
 * 顺带也就不会把 `marked` 打进浏览器 bundle。
 */

import { escapeHtml } from "../html.js";
import {
  hasCustomSurface,
  resolveSectionLayout,
  resolveSurfaceStyle,
  settingBool,
  surfaceStyleAttr,
} from "../section-schema.js";

import { renderBandHtml } from "./band/html.js";
import { renderCardsHtml } from "./cards/html.js";
import { renderFaqHtml } from "./faq/html.js";
import { renderFeatureGridHtml } from "./feature-grid/html.js";
import { renderFormHtml } from "./form/html.js";
import { renderGroupHtml } from "./group/html.js";
import { renderHeroHtml } from "./hero/html.js";
import { renderPageHeaderHtml } from "./page-header/html.js";
import { renderPageMenuHtml } from "./page-menu/html.js";
import { renderPricingHtml } from "./pricing/html.js";
import { renderProseHtml } from "./prose/html.js";
import { renderSpecListHtml } from "./spec-list/html.js";
import { renderStepsHtml } from "./steps/html.js";

import type {
  SectionHtmlRenderer,
  SectionRenderContext,
} from "./render-context.js";
import type { SectionType, SiteSection } from "./types.js";

export type {
  SectionHtmlRenderer,
  SectionRenderContext,
} from "./render-context.js";

/**
 * 页面段流的渲染器表。
 *
 * `header` / `footer` 不在表内——它们是站点级 chrome，由 `header/html.ts`、
 * `footer/html.ts` 各自导出专用签名的渲染函数，不进段流也不套外层色块。
 */
export const SECTION_HTML: Partial<Record<SectionType, SectionHtmlRenderer>> = {
  hero: renderHeroHtml,
  "feature-grid": renderFeatureGridHtml,
  steps: renderStepsHtml,
  "spec-list": renderSpecListHtml,
  cards: renderCardsHtml,
  "page-menu": renderPageMenuHtml,
  pricing: renderPricingHtml,
  faq: renderFaqHtml,
  form: renderFormHtml,
  band: renderBandHtml,
  group: renderGroupHtml,
  "page-header": renderPageHeaderHtml,
  prose: renderProseHtml,
};

/**
 * 与 client/components/sections/SiteSections.tsx 同构：外层「色块」承背景与上下留白，
 * 内层「正文」负责限宽——限宽落在 section 内部，`full` 才可能通栏。
 *
 * `gap` 是这一段**上方**的段间距，由 `resolveSectionGaps` 统一算好传进来。
 */
export function renderSectionHtml(
  section: SiteSection,
  gap = 0,
  ctx: SectionRenderContext = {},
  options: { contained?: boolean } = {},
): string {
  const render = SECTION_HTML[section.type];
  if (!render) return "";
  // 容器段要能下钻回这里；注入而不是让它反向 import，见 render-context.ts
  const inner = render(section, { ...ctx, renderSection: renderSectionHtml });
  if (!inner) return "";
  const layout = resolveSectionLayout(section.settings);
  const surface = resolveSurfaceStyle(section.settings);
  // 容器段的列里没有「通栏」可言：外层已限宽，full 退化成 page
  const width =
    options.contained && layout.width === "full" ? "page" : layout.width;
  // 光晕是容器级的背景效果，和 background/divider 同层（目前只有 hero 声明它）
  const glow = settingBool(section.settings, "show_glow");
  const useTokenBg = !surface.backgroundColor && layout.background !== "none";
  const useDefaultRadius =
    surface.borderRadius === null &&
    (useTokenBg || hasCustomSurface(surface)) &&
    width !== "full";
  const classes = [
    "sec-band",
    `sec-w-${width}`,
    useTokenBg ? `sec-bg-${layout.background}` : "",
    useDefaultRadius ? "sec-radius-default" : "",
    layout.dividerTop ? "sec-divider-top" : "",
    layout.dividerBottom ? "sec-divider-bottom" : "",
    glow ? "has-glow" : "",
    hasCustomSurface(surface) ? "has-surface" : "",
  ]
    .filter(Boolean)
    .join(" ");
  // 存的是桌面值，窄屏由 `.sec` / `.sec-band` 的媒体查询按比例缩
  const style = [
    `--sec-pt:${layout.paddingTop}px`,
    `--sec-pb:${layout.paddingBottom}px`,
    surfaceStyleAttr(surface),
  ]
    .filter(Boolean)
    .join(";");
  const id = layout.anchor ? ` id="${escapeHtml(layout.anchor)}"` : "";
  const glowHtml = glow ? `<div class="sec-glow" aria-hidden="true"></div>` : "";
  const contentClass = options.contained
    ? "sec-content sec-c-contained"
    : `sec-content sec-c-${layout.contentWidth}`;
  return `<section${id} class="sec" style="--sec-gap:${gap}px"><div class="${classes}" style="${style}">${glowHtml}<div class="${contentClass}">${inner}</div></div></section>`;
}
