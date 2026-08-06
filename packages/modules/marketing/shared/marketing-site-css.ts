/**
 * 官网语义 CSS 字符串（SSR / SPA / 预览共用）。
 *
 * 真源是共置的 .css（site-css/base.css、sections/<type>/styles.css），
 * 由 site-css/assemble.mjs 写入 marketing-site-css.generated.ts。
 * 改样式只改 .css，再跑 pnpm --filter @be-water/modules assemble:marketing-css。
 */

export { MARKETING_SITE_CSS } from "./marketing-site-css.generated.js";
