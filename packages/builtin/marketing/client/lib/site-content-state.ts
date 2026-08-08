import type {
  MarketingPageListItem,
  MarketingSite,
} from "../../shared/site-cms.js";
import type { AppLocale } from "@be-water/shared";

/**
 * 站点上是否已经有「起步模板会覆盖」的内容——主语言首页，或编排过的页头 / 页脚。
 *
 * 只看主语言首页：其它语言的页面是从主语言复制出来的译文，起步模板不动它们。
 * 空的 header / footer section 也不算内容——建站时它们默认就在，只是没有 block。
 */
export function hasSiteStarterContent(
  site: MarketingSite | undefined,
  pages: MarketingPageListItem[],
  defaultLocale: AppLocale,
): boolean {
  const hasHome = pages.some(
    (page) => page.kind === "home" && page.locale === defaultLocale,
  );
  if (hasHome) return true;
  if (!site) return false;
  return [...site.header, ...site.footer].some(
    (section) =>
      (section.type === "header" || section.type === "footer") &&
      section.blocks.length > 0,
  );
}
