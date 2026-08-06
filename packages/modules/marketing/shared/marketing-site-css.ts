/**
 * 官网语义 CSS 字符串（SSR / SPA / 预览共用）。
 *
 * 源码按 Shopify section stylesheet 模型拆分：
 * - `site-css/base.ts` — 站点 primitive / `.sec*` / `.grp*`
 * - `sections/_common/styles.ts` — 跨段共用部件
 * - `sections/<type>/styles.ts` — section/block 专用
 *
 * 本文件只做聚合；勿再依赖 Vite `?raw`（测试与打包路径不稳）。
 */

import { commonStyles } from "./sections/_common/styles.js";
import { SECTION_STYLES } from "./sections/styles.js";
import { baseCss } from "./site-css/base.js";

export const MARKETING_SITE_CSS = [baseCss, commonStyles, ...SECTION_STYLES]
  .filter((chunk) => chunk.trim().length > 0)
  .join("\n");
