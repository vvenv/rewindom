/**
 * 实时计数带的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 一个 setting 都不读：抬头与三个行名由 `toPublicHero` 落成当前语言塞进 context，
 * 数字由系统查出来。租户在这一段上能改的只有留白与底色（见 `events-live-section.ts`）。
 *
 * 计数拿不到（provider 还没回来）或站点还没有事件时**整段不画**，返回 ""——
 * 首屏挂一串 0 比不挂更糟，与 `entity_strip` 空态同一条纪律。
 */

import { readEventsContext } from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";

import type { PublicHeroView } from "../events-section-context.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

/**
 * 每格里 `dt`（行名）在 `dd`（读数）**之前**——`dl` 的语义要求如此，读屏也该先听见
 * 「正在追踪」再听见「137 个事件」。视觉上数字在上、行名在下，那是 CSS 用 `order`
 * 翻的：把 `dd` 写在 `dt` 前面能省掉一行样式，但会写出一份不合法的 `dl`。
 */
function renderRows(hero: PublicHeroView): string {
  return hero.stats
    .map((stat) => {
      const unit = stat.unit
        ? `<span class="events-live-value-unit">${escapeHtml(stat.unit)}</span>`
        : "";
      return `<div class="events-live-stat"><dt>${escapeHtml(stat.label)}</dt><dd><span class="events-live-value">${escapeHtml(stat.value)}</span>${unit}</dd></div>`;
    })
    .join("");
}

export const renderEventsLiveHtml: SectionHtmlRenderer = (_section, ctx) => {
  const hero = readEventsContext(ctx)?.hero ?? null;
  if (!hero || hero.stats.length === 0) return "";

  // 读者看「6 分钟前」，爬虫读 datetime——同一件事留两份
  const updated = hero.updated
    ? `<time class="events-live-updated" datetime="${escapeHtml(hero.updated.datetime)}">${escapeHtml(hero.updated.value)}</time>`
    : "";
  /*
   * 抬头那颗点是这一段唯一的动效，也是它存在的理由：读者不必读完三个数
   * 就知道这台雷达是开着的。`prefers-reduced-motion` 下由 CSS 停掉。
   */
  return `<div class="events-live">
  <p class="events-live-head"><span class="events-live-pulse" aria-hidden="true"></span>${escapeHtml(hero.live_label)}${updated}</p>
  <dl class="events-live-stats">${renderRows(hero)}</dl>
</div>`;
};
