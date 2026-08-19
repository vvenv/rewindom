/**
 * 官网首屏的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 两列：左边是主张（全是 setting，租户随时改），右边是**系统查出来的**实时计数。
 * 分工是刻意的——广告词归租户，数字归系统，谁都不能替对方说话。
 *
 * 计数拿不到（provider 还没回来）或站点还没有事件时整块不画，左列独占整行：
 * 首屏挂一串 0 比不挂更糟，与 entity_strip 空态返回 "" 同一条纪律。
 */

import { readEventsContext } from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { buttonRow } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { PublicHeroView } from "../events-section-context.js";

function renderStats(hero: PublicHeroView): string {
  const rows = hero.stats
    .map((stat) => {
      // 相对时间同时留一份机器可读的绝对时刻：读者看「6 分钟前」，爬虫读 datetime
      const value = stat.datetime
        ? `<time class="events-hero-stat-value" datetime="${escapeHtml(stat.datetime)}">${escapeHtml(stat.value)}</time>`
        : `<span class="events-hero-stat-value">${escapeHtml(stat.value)}</span>`;
      const unit = stat.unit
        ? `<span class="events-hero-stat-unit">${escapeHtml(stat.unit)}</span>`
        : "";
      return `<div class="events-hero-stat"><dt>${escapeHtml(stat.label)}</dt><dd>${value}${unit}</dd></div>`;
    })
    .join("");
  /*
   * 抬头那颗点是这块面板唯一的动效，也是它存在的理由：读者不必读完四行数字
   * 就知道这台雷达是开着的。`prefers-reduced-motion` 下由 CSS 停掉。
   */
  return `<div class="events-hero-panel">
  <p class="events-hero-live"><span class="events-hero-pulse" aria-hidden="true"></span>${escapeHtml(hero.live_label)}</p>
  <dl class="events-hero-stats">${rows}</dl>
</div>`;
}

export const renderEventsHeroHtml: SectionHtmlRenderer = (section, ctx) => {
  const s = section.settings;
  const headline = settingText(s, "headline");
  const eyebrow = settingText(s, "eyebrow");
  const subhead = settingText(s, "subhead");

  const hero = readEventsContext(ctx)?.hero ?? null;
  const stats =
    settingBool(s, "show_stats") && hero && hero.stats.length > 0
      ? renderStats(hero)
      : "";

  const main = `<div class="events-hero-main">
  ${eyebrow ? `<p class="events-hero-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
  <h1 class="events-hero-headline">${escapeHtml(headline)}</h1>
  ${subhead ? `<p class="events-hero-lead">${escapeHtml(subhead)}</p>` : ""}
  ${buttonRow(s, "left")}
</div>`;

  return `<div class="events-hero${stats ? " has-panel" : ""}">${main}${stats}</div>`;
};
