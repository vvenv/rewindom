/**
 * 官网首屏的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 两列：左边是主张（全是 setting，租户随时改），右边是**系统查出来的**实时计数。
 * 分工是刻意的——广告词归租户，数字归系统，谁都不能替对方说话。
 *
 * 计数拿不到（provider 还没回来）或站点还没有事件时整块不画，左列独占整行：
 * 首屏挂一串 0 比不挂更糟，与 entity_strip 空态返回 "" 同一条纪律。
 *
 * 枢纽 / 首页与专题页是两张模板。文案与按钮链接走与页脚同一套 `{token}`：
 * `{topic}` 是主题名，`{topic_slug}` 是路径段，`{feed}` 是当前页 RSS。
 * 订阅是普通次按钮，默认 href `{feed}`。
 */

import {
  EVENTS_FEED_HREF_TEMPLATE,
  eventsInterpolationValues,
  readEventsContext,
} from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { buttonRow } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";
import {
  interpolateSiteHref,
  interpolateSiteText,
  readContributedInterpolation,
} from "@rewindom/builtin/marketing/shared/site-interpolation.js";

import type { PublicHeroView } from "../events-section-context.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { SettingValues } from "@rewindom/builtin/marketing/shared/section-settings.js";

function interpolationOf(
  ctx: Parameters<SectionHtmlRenderer>[1],
): Record<string, string> {
  const context = readEventsContext(ctx);
  return {
    ...(context ? eventsInterpolationValues(context) : {}),
    ...readContributedInterpolation(ctx.contributed),
  };
}

function withInterpolatedCtas(
  s: SettingValues,
  ctx: Parameters<SectionHtmlRenderer>[1],
  values: Record<string, string>,
): SettingValues {
  const next: SettingValues = { ...s };
  for (const prefix of ["primary", "secondary"] as const) {
    const label = interpolateSiteText(settingText(s, `${prefix}_label`), values);
    const rawHref =
      settingText(s, `${prefix}_href`) ||
      (prefix === "secondary" ? EVENTS_FEED_HREF_TEMPLATE : "");
    const href = interpolateSiteHref(rawHref, values);
    next[`${prefix}_label`] = label;
    next[`${prefix}_href`] = href ? siteHref(href, ctx) : "";
  }
  return next;
}

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
  const context = readEventsContext(ctx);
  const values = interpolationOf(ctx);

  const headline = interpolateSiteText(settingText(s, "headline"), values);
  const eyebrow = interpolateSiteText(settingText(s, "eyebrow"), values);
  const subhead = interpolateSiteText(settingText(s, "subhead"), values);

  const hero = context?.hero ?? null;
  const stats =
    settingBool(s, "show_stats") && hero && hero.stats.length > 0
      ? renderStats(hero)
      : "";

  const main = `<div class="events-hero-main">
  ${eyebrow ? `<p class="events-hero-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
  <h1 class="events-hero-headline">${escapeHtml(headline)}</h1>
  ${subhead ? `<p class="events-hero-lead">${escapeHtml(subhead)}</p>` : ""}
  ${buttonRow(withInterpolatedCtas(s, ctx, values), "left")}
</div>`;

  return `<div class="events-hero${stats ? " has-panel" : ""}">${main}${stats}</div>`;
};
