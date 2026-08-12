/**
 * 把一串 chrome 块摊成「行 × 对齐区」，SSR 与 React 共用。
 *
 * 分组是纯函数、只有一份：两端各自 `filter` 一遍的话，某天有人在一边多加一条
 * 「空区不渲染」，另一边就会多出一个撑着 gap 的空盒子——而这种差异只在特定块组合下
 * 才看得出来。
 */

import {
  blockAlign,
  blockMobile,
  blockRow,
  CHROME_ROW_COUNT,
  type ChromeAlign,
} from "./chrome-blocks.js";

import type { SiteBlock } from "../types.js";

const ALIGNS: readonly ChromeAlign[] = ["start", "center", "end"];

export interface ChromeZone {
  align: ChromeAlign;
  blocks: SiteBlock[];
}

export interface ChromeRow {
  /** 1 起，用于 class 与调试；不连续（第 2 行空着时第 3 行仍叫 3）。 */
  index: number;
  zones: ChromeZone[];
  /** 这一行里有没有「窄屏收进菜单」的块——汉堡按钮据此逐行决定渲不渲染。 */
  hasMenu: boolean;
}

/**
 * 空行与空区一律不产出。
 *
 * 行是 `grid-template-columns: 1fr auto 1fr` 的三格，空区渲染出来是个零宽盒子，本身
 * 无害；但行不同——空行会实打实占掉一份 padding 与 gap，页脚底下于是凭空多出一条缝。
 */
export function chromeRows(blocks: readonly SiteBlock[]): ChromeRow[] {
  const rows: ChromeRow[] = [];
  for (let index = 1; index <= CHROME_ROW_COUNT; index += 1) {
    const inRow = blocks.filter((block) => blockRow(block) === index);
    if (inRow.length === 0) continue;
    const zones = ALIGNS.map((align) => ({
      align,
      blocks: inRow.filter((block) => blockAlign(block) === align),
    })).filter((zone) => zone.blocks.length > 0);
    rows.push({
      index,
      zones,
      hasMenu: inRow.some((block) => blockMobile(block) === "menu"),
    });
  }
  return rows;
}

/**
 * 一个块在窄屏下的 class。
 *
 * `menu` 的块在**桌面**上必须当作不存在——外面那层 `.chrome-drawer` 是
 * `display: contents`，块因此直接落在自己的对齐区里，和不带菜单时的排版一模一样。
 * 窄屏才把 drawer 变成真容器收起来。一份 DOM 走到底，不再像以前那样把导航复制一份
 * 塞进 `.header-mobile-nav`（同一批链接在 DOM 里出现两次，读屏器会念两遍）。
 */
export function chromeBlockClass(block: SiteBlock, base: string): string {
  const mobile = blockMobile(block);
  return mobile === "hide" ? `${base} chrome-mobile-hide` : base;
}
