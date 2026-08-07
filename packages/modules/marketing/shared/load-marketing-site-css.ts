import {
  MARKETING_SECTION_CSS,
  MARKETING_SITE_CSS,
  MARKETING_SITE_CSS_BASE,
} from "./marketing-site-css.js";

/**
 * 贡献段的 CSS。
 *
 * 内置段的样式与它们的段目录并置、构建期打进 `MARKETING_SECTION_CSS`；贡献段来自别的
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

/**
 * 全量官网语义 CSS：内置（构建期打包）+ 贡献段（运行期注册）。
 *
 * 编辑器预览 / SPA shell 用——那两处用户随时会往页面上加段，按需没有意义。
 * SSR 用 `loadMarketingSiteCssFor()`。
 */
export function loadMarketingSiteCss(): string {
  if (CONTRIBUTED_CSS.size === 0) return MARKETING_SITE_CSS;
  return `${MARKETING_SITE_CSS}\n${[...CONTRIBUTED_CSS.values()].join("\n")}`;
}

/**
 * 按需官网语义 CSS：常驻部分 + `types` 里这些段的样式。
 *
 * 顺序**由注册顺序定，不由页面上段的排列定**：段的顺序是租户在编辑器里拖出来的，
 * 让它决定层叠顺序意味着同特异性的规则谁赢取决于内容编排——今天把某段往上拖一下
 * 样式就变，且只在特定配置下复现。这里一律按 `MARKETING_SECTION_CSS` 的键序输出，
 * 贡献段照旧垫底。
 *
 * 收多了只是多几百字节，收少了是样式丢失——拿不准的一律收。
 */
export function loadMarketingSiteCssFor(
  types: ReadonlySet<string>,
): string {
  const chunks = [MARKETING_SITE_CSS_BASE];
  for (const [type, css] of Object.entries(MARKETING_SECTION_CSS)) {
    if (types.has(type)) chunks.push(css);
  }
  for (const [type, css] of CONTRIBUTED_CSS) {
    if (types.has(type)) chunks.push(css);
  }
  return chunks.join("\n");
}
