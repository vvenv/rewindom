/**
 * 公开实体页的 markup（SSR 与编辑器预览共用同一份）。实体页的价值在**时间尺度**——
 * 事件 24h 后就凉，实体不会，所以这一页值得被反复回访。
 *
 * 这一段只剩**事件列表**。身份（名字 h1 + 类型）与累计档案都画在 `events.entity-hero`
 * 上：一张实体名片该是名字紧跟着事实，拆成两个色块读者要跨过一句库存文案才看到数字。
 *
 * 列表标题默认为空，因此默认整段就是一个列表：这一页只有这一个列表，上面又刚说完
 * 这是谁，再挂一个「相关事件」只是把眼睛多拦一道。租户填了才画。
 *
 * 卡片与首页同一套厚薄规则（`event-card-html.ts`）。
 */

import { readEventsContext } from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import { eventCardHtml } from "./event-card-html.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { PublicEntityView } from "../events-section-context.js";

export const renderEventsEntityHtml: SectionHtmlRenderer = (section, ctx) => {
  const context = readEventsContext(ctx);
  const entity = context?.entity;
  // 没有当前实体（摆错了页面 / 预览没给样张）→ 整段不渲染，而不是画一块空白
  if (!entity) {
    return "";
  }

  const s = section.settings;
  const showSources = settingBool(s, "show_sources");

  const list =
    entity.events.length > 0
      ? `<ul class="events-grid">${entity.events
          .map((card) => eventCardHtml(card, showSources, ctx))
          .join("")}</ul>`
      : emptyHtml(settingText(s, "empty_text"));

  const related =
    entity.related_entities.length > 0 ? relatedHtml(entity, ctx) : "";

  return [`<section class="events-entity">`, list, related, `</section>`]
    .filter(Boolean)
    .join("");
};

/**
 * 「这家常和谁一起出现」——同一事件里共现过的其他实体。
 *
 * 胶囊形状与枢纽 / 详情页一致（events-entity-chip），平铺不分组：相关是 Top N，
 * 不是一整页要分类浏览。共现次数替了枢纽的分组计数。
 *
 * kind 放 title 里——hover 显示「公司 / 产品」，不占版面：枢纽靠分组标题承担
 * kind，相关没有分组，但 Top 5 分类不重要，hover 给到就够。
 */
function relatedHtml(
  entity: PublicEntityView,
  ctx: Parameters<SectionHtmlRenderer>[1],
): string {
  const chips = entity.related_entities
    .map(
      (item) =>
        `<li><a class="events-entity-chip" href="${escapeHtml(
          siteHref(item.href, ctx),
        )}" title="${escapeHtml(item.kind_label)}" translate="no">${escapeHtml(
          item.name,
        )}<span class="events-entity-count">${item.co_occurrence_count}</span></a></li>`,
    )
    .join("");
  return `<section class="events-entity-related"><h2 class="events-entity-section-title">${escapeHtml(
    entity.related_label,
  )}</h2><ul class="events-entity-chips">${chips}</ul></section>`;
}

function emptyHtml(text: string): string {
  return text ? `<p class="events-empty">${escapeHtml(text)}</p>` : "";
}
