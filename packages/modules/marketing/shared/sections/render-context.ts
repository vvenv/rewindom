/**
 * SSR 渲染的上下文与渲染器签名。
 *
 * 与 `types.ts` 分开是为了断环：这里要引 `site-cms` 的页面目录类型，而 `site-cms`
 * 反过来引 `section-schema`（它 re-export 了 `types.ts`）。把这两个类型留在 `types.ts`
 * 会连成一圈，而模块包的 `import-x/no-cycle` 是 error。只有各段的 `html.ts` 引本文件，
 * 那条链上没有任何东西回指它。
 */

import type { SiteSection } from "./types.js";
import type { PublicSitePage } from "../site-cms.js";
import type { AppLocale } from "@be-water/shared";

/** `page-menu` 等需要站点目录的 section 渲染上下文。 */
export interface SectionRenderContext {
  pages?: PublicSitePage[];
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
  /** 主题的「区块间距」；容器段要拿它算列内子段之间的缝。 */
  sectionSpacing?: number;
  /**
   * 渲染一整段（含外层色块）——**只有容器段用得上**，由聚合层 `renderSectionHtml`
   * 在下钻时注入。
   *
   * 不让 `group/html.ts` 直接 import 聚合层，是因为聚合层本来就要 import 它：
   * 那条边会成环。注入之后依赖方向只有一条（聚合层 → 各段），加多少段都不会变。
   */
  renderSection?: (
    section: SiteSection,
    gap: number,
    ctx: SectionRenderContext,
    options?: { contained?: boolean },
  ) => string;
}

/**
 * 一段的 SSR 渲染器：只产出**段内正文**，外层色块（留白 / 底色 / 分隔线 / 限宽）
 * 由聚合层的 `renderSectionHtml` 统一承担，和客户端 `SiteSections` 保持同构。
 */
export type SectionHtmlRenderer = (
  section: SiteSection,
  ctx: SectionRenderContext,
) => string;
