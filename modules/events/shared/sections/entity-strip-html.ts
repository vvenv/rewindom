/**
 * 近期实体胶囊条的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 胶囊形状跟详情页 / 枢纽相同；这里是平铺的 Top N，不按类型分组——
 * 分组是枢纽的事，「查看全部」把人送过去。
 */

import { EVENTS_ENTITY_STRIP_LIMIT_DEFAULT } from "../events-entity-strip-section.js";
import { readEventsContext } from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingNumber,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const renderEventsEntityStripHtml: SectionHtmlRenderer = (
  section,
  ctx,
) => {
  const context = readEventsContext(ctx);
  const strip = context?.entity_strip;
  if (!strip || strip.items.length === 0) {
    return "";
  }

  const s = section.settings;
  const limit = settingNumber(s, "limit", EVENTS_ENTITY_STRIP_LIMIT_DEFAULT);
  const items = strip.items.slice(0, Math.max(0, limit));
  if (items.length === 0) {
    return "";
  }

  const showCounts = settingBool(s, "show_counts");
  const chips = items
    .map(
      (item) =>
        `<li><a class="events-entity-chip" href="${escapeHtml(
          siteHref(item.href, ctx),
        )}" translate="no">${escapeHtml(item.name)}${
          showCounts
            ? `<span class="events-entity-count">${item.event_count}</span>`
            : ""
        }</a></li>`,
    )
    .join("");

  const moreLabel = settingText(s, "more_label");
  const more = moreLabel
    ? `<a class="events-more" href="${escapeHtml(
        siteHref(strip.href, ctx),
      )}">${escapeHtml(moreLabel)}</a>`
    : "";

  return `<div class="events-entity-strip">${sectionHeading(
    s,
  )}<ul class="events-entity-chips">${chips}</ul>${more}</div>`;
};
