/**
 * 官网语义 CSS（SSR / SPA / 预览共用）。
 *
 * 真源是共置的 .css（site-css/base.css、sections/<type>/styles.css），
 * 由 site-css/assemble.mjs 压缩后写入 marketing-site-css.generated.ts。
 * 改样式只改 .css，再跑 pnpm --filter @rewindom/builtin assemble:marketing-css。
 */

import {
  MARKETING_SECTION_CSS,
  MARKETING_SITE_CSS_BASE,
} from "./marketing-site-css.generated.js";

export { MARKETING_SECTION_CSS, MARKETING_SITE_CSS_BASE };

/**
 * 全量样式表：常驻部分 + 所有内置段。
 *
 * 给编辑器预览和 SPA shell 用——那两处用户随时会加新段，按需发反而要在每次改动
 * 后补注样式。SSR 走 `loadMarketingSiteCssFor()` 的按需口径。
 */
export const MARKETING_SITE_CSS = [
  MARKETING_SITE_CSS_BASE,
  ...Object.values(MARKETING_SECTION_CSS),
].join("\n");
