import { MARKETING_SITE_CSS } from "./marketing-site-css.js";

/**
 * 贡献段的 CSS。
 *
 * 内置段的样式与它们的段目录并置、构建期打进 `MARKETING_SITE_CSS`；贡献段来自别的
 * 模块，进不了那次打包，只能在注册时把 CSS 交进来、渲染时拼在后面。
 *
 * 拼在**最后**：贡献方需要覆盖内置的 token / 类时不必打优先级战争。
 */
const CONTRIBUTED_CSS = new Map<string, string>();

/** 由 `registerSiteSectionHtml` / `registerSiteSectionView` 调用；同 type 覆盖。 */
export function registerSectionCss(type: string, css: string): void {
  CONTRIBUTED_CSS.set(type, css);
}

/** 仅供测试。 */
export function resetSectionCss(): void {
  CONTRIBUTED_CSS.clear();
}

/** 官网语义 CSS：内置（构建期打包）+ 贡献段（运行期注册）。 */
export function loadMarketingSiteCss(): string {
  if (CONTRIBUTED_CSS.size === 0) return MARKETING_SITE_CSS;
  return `${MARKETING_SITE_CSS}\n${[...CONTRIBUTED_CSS.values()].join("\n")}`;
}
