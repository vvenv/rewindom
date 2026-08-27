/**
 * 公开面来源 favicon 的 markup。SSR 与编辑器预览共用。
 *
 * alt 留空：名字就写在图标旁边，图标是装饰。坏掉的图 onerror 摘掉 img，
 * 底下的首字母占位露出来，来源行始终占位。
 */

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";

import { sourceMonogram } from "./source-icon.js";

/**
 * 卡片上最多列几家来源。
 *
 * 线上那张 Dolly Parton 的卡列了 9 家、占三行灰图标，视觉重量压过标题本身——
 * 而读者从第四个名字起读到的已经不是「谁在报」，是一段噪音。工作台那张 React
 * 卡片一直是 3 家 + `+N`，这里补上同一个数：一个产品不该有两套口径。
 *
 * 只作用在**卡片**。详情页与来源列表是清单，那里要列全。
 */
export const CARD_SOURCE_LIMIT = 3;

export function sourceIconImgHtml(
  iconUrl: string | null | undefined,
  name: string,
): string {
  const img = iconUrl
    ? `<img class="events-source-icon" src="${escapeHtml(
        iconUrl,
      )}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`
    : "";
  const fallback = `<span class="events-source-icon-fallback">${escapeHtml(
    sourceMonogram(name),
  )}</span>`;
  return `<span class="events-source-icon-slot" aria-hidden="true">${fallback}${img}</span>`;
}

export function sourcesLineHtml(
  names: readonly string[],
  iconUrls: readonly (string | null)[] = [],
  /** 传了才封顶，超出的收成一个 `+N`。不传 = 列全（详情页、来源列表） */
  limit?: number,
): string {
  if (names.length === 0) {
    return "";
  }
  const shown = limit === undefined ? names : names.slice(0, limit);
  const items = shown
    .map((name, index) => {
      const icon = sourceIconImgHtml(iconUrls[index], name);
      return `<span class="events-source">${icon}${escapeHtml(name)}</span>`;
    })
    .join("");
  // `+3` 是个数字，不是句子——不进 i18n，工作台那份也是这么写的
  const rest = names.length - shown.length;
  const more =
    rest > 0 ? `<span class="events-source-more">+${rest}</span>` : "";
  return `<p class="events-sources" translate="no">${items}${more}</p>`;
}
