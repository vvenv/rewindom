/**
 * 官网首屏的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 两列：左边是主张（全是 setting，租户随时改），右边是**系统查出来的**实时计数。
 * 分工是刻意的——广告词归租户，数字归系统，谁都不能替对方说话。
 *
 * 计数拿不到（provider 还没回来）或站点还没有事件时整块不画，左列独占整行：
 * 首屏挂一串 0 比不挂更糟，与 entity_strip 空态返回 "" 同一条纪律。
 *
 * 主题枢纽（`/ai` 等）与 `/` 渲染的是同一张 CMS 页，所以主题版文案走同一段上的
 * `topic_*` 覆盖字段，不另起一张页。
 */

import { eventsFeedPath, readEventsContext } from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { buttonRow } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";

import type { EventTopic } from "../events.js";
import type { PublicHeroView } from "../events-section-context.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { SettingValues } from "@rewindom/builtin/marketing/shared/section-settings.js";

/** 站点全量 feed 的**逻辑**地址——按它认「这个按钮是订阅按钮」。 */
const SITE_FEED_PATH = eventsFeedPath();

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
 * 站点 feed 的按钮 → 当前格子的 feed。不是订阅按钮就返回 null。
 *
 * 按**后缀**认而不是等值：`localizeSection` 在渲染前就给 `link` 设置补过 locale
 * 前缀，非默认语言页面上这里拿到的已经是 `/zh-CN/events/feed.xml`。等值匹配会让
 * 主题订阅只在默认语言上生效——中文站点进 AI 枢纽点订阅，拿到的是全站 feed。
 *
 * 只认站内绝对路径：外链恰好以 `/events/feed.xml` 收尾时不该被改写。
 * 已经带查询串的也不动——那是租户自己填的，我们不去覆盖它。
 */
function topicFeedHref(href: string, topic: EventTopic): string | null {
  if (!href.startsWith("/") || !href.endsWith(SITE_FEED_PATH)) return null;
  // 查询串取自 `eventsFeedPath`，参数名只有那一处定义
  return href + eventsFeedPath(topic).slice(SITE_FEED_PATH.length);
}

/**
 * 主题枢纽上要改写的两处按钮字段：次按钮文案（`{{topic}}`）与订阅地址。
 *
 * 只改指向站点 feed 的那个按钮，租户填的其它链接一概不动——在 AI 枢纽上点
 * 「订阅」却拿到全站 feed，是这一页能犯的最直接的一个错。
 */
function withTopicFeed(
  s: SettingValues,
  topic: EventTopic | undefined,
  topicLabel: string,
): SettingValues {
  const patched: SettingValues = { ...s };
  const label = copy(s, "secondary_label", "topic_secondary_label", topicLabel);
  if (label) patched.secondary_label = label;
  if (!topic) return patched;
  for (const prefix of ["primary", "secondary"] as const) {
    const next = topicFeedHref(settingText(s, `${prefix}_href`), topic);
    if (next) patched[`${prefix}_href`] = next;
  }
  return patched;
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
  const topic = context?.topic;

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
  ${buttonRow(withTopicFeed(s, topic, topicLabel), "left")}
</div>`;

  return `<div class="events-hero${stats ? " has-panel" : ""}">${main}${stats}</div>`;
};
