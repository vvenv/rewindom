/**
 * SSR 侧 section 渲染的服务端入口。
 *
 * 真正的实现按段拆在 `shared/sections/<type>/html.ts`，与各自的 schema
 * （`definition.ts`）同目录；本文件只是服务端的取用口。SEO 正文以这条链路为准，
 * 客户端只是水合后的可读 UI。
 */

export {
  renderSectionHtml,
  type SectionHtmlRenderer,
  type SectionRenderContext,
} from "../shared/sections/html.js";
export {
  renderHeaderHtml,
  type LocaleSwitcherOption,
} from "../shared/sections/header/html.js";
export { renderFooterHtml } from "../shared/sections/footer/html.js";
