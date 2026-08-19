/**
 * 实体枢纽的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 按类型分组，每组一串胶囊链接——与详情页上的实体胶囊是同一种形状，
 * 读者在两处看到的是同一个东西。
 */

import { readEventsContext } from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const renderEventsEntityIndexHtml: SectionHtmlRenderer = (
  section,
  ctx,
) => {
  const context = readEventsContext(ctx);
  const index = context?.entity_index;
  // 没有清单（摆错了页面 / 预览没给样张）→ 整段不渲染，而不是画一块空白
  if (!index) {
    return "";
  }

  const showCounts = settingBool(section.settings, "show_counts");
  const groups = index.groups.filter((group) => group.items.length > 0);
  if (groups.length === 0) {
    const empty = settingText(section.settings, "empty_text");
    return empty
      ? `<p class="events-empty">${escapeHtml(empty)}</p>`
      : "";
  }

  const body = groups
    .map(
      (group) =>
        `<section class="events-entity-group"><h2 class="events-entity-group-title">${escapeHtml(
          group.label,
        )}</h2><ul class="events-entity-chips">${group.items
          .map(
            (item) =>
              `<li><a class="events-entity-chip" href="${escapeHtml(
                siteHref(item.href, ctx),
              )}">${escapeHtml(item.name)}${
                showCounts
                  ? `<span class="events-entity-count">${item.event_count}</span>`
                  : ""
              }</a></li>`,
          )
          .join("")}</ul></section>`,
    )
    .join("");
  return `<div class="events-entity-index">${body}</div>`;
};
