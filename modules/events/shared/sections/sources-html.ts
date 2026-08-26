/**
 * 采集源列表的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 空清单仍画标题 + 空态：这是方法论文，编辑器里必须看得见这段，
 * 不能像实体条那样「没数据就整段消失」。
 */

import { readEventsContext } from "../events-section-context.js";
import { sourceIconImgHtml } from "../source-icon-html.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";

import type { PublicSourceCatalogItem } from "../events-section-context.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const renderEventsSourcesHtml: SectionHtmlRenderer = (section, ctx) => {
  const catalog = readEventsContext(ctx)?.source_catalog;
  const s = section.settings;
  const emptyText = settingText(s, "empty_text");
  const items = catalog?.items ?? [];
  const body =
    items.length === 0
      ? emptyText
        ? `<p class="events-source-catalog-empty">${escapeHtml(emptyText)}</p>`
        : ""
      : settingBool(s, "group_by_topic")
        ? groupsHtml(catalog?.groups ?? [])
        : `<ul class="events-source-catalog-list">${items.map(itemHtml).join("")}</ul>`;

  return `<div class="events-source-catalog">${sectionHeading(s)}${body}</div>`;
};

function groupsHtml(
  groups: readonly { label: string; items: readonly PublicSourceCatalogItem[] }[],
): string {
  return groups
    .map(
      (group) =>
        `<section class="events-source-catalog-group"><h3 class="events-source-catalog-topic">${escapeHtml(
          group.label,
        )}</h3><ul class="events-source-catalog-list">${group.items
          .map(itemHtml)
          .join("")}</ul></section>`,
    )
    .join("");
}

function itemHtml(item: PublicSourceCatalogItem): string {
  return `<li class="events-source-catalog-item"><a href="${escapeHtml(
    item.href,
  )}" rel="noreferrer noopener" target="_blank" translate="no">${sourceIconImgHtml(
    item.icon_url,
    item.name,
  )}${escapeHtml(item.name)}</a><span class="events-source-catalog-kind">${escapeHtml(
    item.kind_label,
  )}</span></li>`;
}
