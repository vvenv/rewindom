/**
 * 公开面来源 favicon 的 markup。SSR 与编辑器预览共用。
 *
 * alt 留空：名字就写在图标旁边，图标是装饰。坏掉的图 onerror 摘掉 img，
 * 底下 globe fallback 露出来，来源行始终占位。
 */

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";

import { sourceIconFallbackSvg } from "./source-icon.js";

export function sourceIconImgHtml(iconUrl: string | null | undefined): string {
  const img = iconUrl
    ? `<img class="events-source-icon" src="${escapeHtml(
        iconUrl,
      )}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`
    : "";
  return `<span class="events-source-icon-slot" aria-hidden="true">${sourceIconFallbackSvg()}${img}</span>`;
}

export function sourcesLineHtml(
  names: readonly string[],
  iconUrls: readonly (string | null)[] = [],
): string {
  if (names.length === 0) {
    return "";
  }
  const items = names
    .map((name, index) => {
      const icon = sourceIconImgHtml(iconUrls[index]);
      return `<span class="events-source">${icon}${escapeHtml(name)}</span>`;
    })
    .join("");
  return `<p class="events-sources" translate="no">${items}</p>`;
}
