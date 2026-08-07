/**
 * 本页会渲染到哪些段 type —— SSR 据此只发这几段的 CSS。
 */

import type { SiteSection } from "./types.js";

/**
 * 递归收集 section 的 type，含容器段列里的子段。
 *
 * **必须下钻 `blocks[].sections`**：`group` 的列里装着别的段，漏收它们就是那几段
 * 裸着渲染出来——而且只在「用了分栏」的页面上复现。
 *
 * 刻意不过滤 entitlement 未开通的贡献段：那要在这里复刻一遍渲染期的闸门逻辑，
 * 两处判断早晚会不一致。多收一个段的代价是几百字节，少收一个是页面花掉。
 */
export function collectSectionTypes(
  sections: readonly SiteSection[],
  into: Set<string> = new Set(),
): Set<string> {
  for (const section of sections) {
    into.add(section.type);
    for (const block of section.blocks ?? []) {
      if (block.sections) collectSectionTypes(block.sections, into);
    }
  }
  return into;
}
