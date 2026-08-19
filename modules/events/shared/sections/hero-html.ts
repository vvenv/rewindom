/**
 * 官网首屏的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 两列：左边是主张（全是 setting，租户随时改），右边是**系统查出来的**实时计数。
 * 分工是刻意的——广告词归租户，数字归系统，谁都不能替对方说话。
 *
 * 计数拿不到（provider 还没回来）或站点还没有事件时整块不画，左列独占整行：
 * 首屏挂一串 0 比不挂更糟，与 entity_strip 空态返回 "" 同一条纪律。
 *
 * 主题枢纽（`/ai` 等）与 `/` 渲染的是同一张 CMS 页，所以主题版身份文案走同一段上的
 * `topic_eyebrow` / `topic_headline`，不另起一张页。订阅按钮没有 href 控件，地址
 * 跟页头订阅入口共用 `eventsSubscribeHref`。
 */

import {
  eventsSubscribeHref,
  readEventsContext,
} from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { buttonRow } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import type { PublicHeroView } from "../events-section-context.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { SettingValues } from "@rewindom/builtin/marketing/shared/section-settings.js";

/** `{{topic}}` → 已落成当前语言的主题名。没有占位就原样返回。 */
function withTopic(text: string, label: string): string {
  return label ? text.replaceAll("{{topic}}", label) : text;
}

/**
 * 主题枢纽上取哪一条文案：`topic_*` 有值就用它，留空回落站点那条。
 *
 * 回落而不是留空：租户清掉主题标题多半是「不想单独写」，不是「主题页不要标题」。
 */
function copy(
  s: SettingValues,
  id: string,
  topicId: string,
  topicLabel: string,
): string {
  const override = topicLabel ? settingText(s, topicId) : "";
  return withTopic(override || settingText(s, id), topicLabel);
}

/**
 * 主按钮仍走通用 `link` 控件；订阅按钮没有 href，地址按当前页取。
 *
 * 只改订阅那一颗：租户给主按钮填的关于页 / 外链一概不动。
 * 文案键仍是 `secondary_label` / `topic_secondary_label`（存量页）。
 */
function withSubscribeCta(
  s: SettingValues,
  ctx: Parameters<SectionHtmlRenderer>[1],
  topicLabel: string,
): SettingValues {
  const label = copy(s, "secondary_label", "topic_secondary_label", topicLabel);
  if (!label) return s;
  return {
    ...s,
    secondary_label: label,
    secondary_href: siteHref(eventsSubscribeHref(ctx), ctx),
  };
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
  /*
   * 主题身份不从 `hero` 上取：计数为空时 `hero` 是 null，而那一格暂时没有事件
   * 不代表首屏该改回站点主张。
   */
  const topicLabel = context?.topic_label ?? "";

  const headline = copy(s, "headline", "topic_headline", topicLabel);
  const eyebrow = copy(s, "eyebrow", "topic_eyebrow", topicLabel);
  const subhead = withTopic(settingText(s, "subhead"), topicLabel);

  const hero = context?.hero ?? null;
  const stats =
    settingBool(s, "show_stats") && hero && hero.stats.length > 0
      ? renderStats(hero)
      : "";

  const main = `<div class="events-hero-main">
  ${eyebrow ? `<p class="events-hero-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
  <h1 class="events-hero-headline">${escapeHtml(headline)}</h1>
  ${subhead ? `<p class="events-hero-lead">${escapeHtml(subhead)}</p>` : ""}
  ${buttonRow(withSubscribeCta(s, ctx, topicLabel), "left")}
</div>`;

  return `<div class="events-hero${stats ? " has-panel" : ""}">${main}${stats}</div>`;
};
