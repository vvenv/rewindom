/**
 * 段 type → React 视图的一张表。
 *
 * 以前这里是 `SiteSections.tsx` 里的一个 `switch`，各段的 JSX 全挤在同一个文件里、
 * 与它们的 schema 和 SSR 渲染各隔一个包。现在一段的三处实现分别是
 * `views/<type>.tsx`、`shared/sections/<type>/definition.ts`、`shared/sections/<type>/html.ts`。
 *
 * `header` / `footer` 不在表内：它们是站点级 chrome，由 `SiteChrome.tsx` 渲染，不进段流。
 */

import type { ComponentType } from "react";

import { registerSectionCss } from "../../../shared/load-marketing-site-css.js";
import {
  registerSectionDefinition,
  type SectionDefinition,
  type SectionType,
} from "../../../shared/section-schema.js";
import { registerSectionIcon } from "../theme-editor/section-icons.js";

import { BandSection } from "./views/band.js";
import { GroupSection } from "./views/group.js";
import { HeroSection } from "./views/hero.js";
import { PageHeaderSection } from "./views/page-header.js";
import { PageMenuSection } from "./views/page-menu.js";
import { PageMissingSection } from "./views/page-missing.js";
import { ProseSection } from "./views/prose.js";

import type { SectionViewProps } from "./section-parts.js";
import type { LucideIcon } from "lucide-react";

export const SECTION_VIEWS: Partial<
  Record<SectionType, ComponentType<SectionViewProps>>
> = {
  hero: HeroSection,
  "page-missing": PageMissingSection,
  "page-menu": PageMenuSection,
  band: BandSection,
  group: GroupSection,
  "page-header": PageHeaderSection,
  prose: ProseSection,
};

/**
 * 业务模块贡献一个段的 **客户端**入口（编辑器预览与工作台侧渲染）。
 *
 * 与 SSR 侧的 `registerSiteSectionHtml` 成对：两边分开注册不是设计取舍，是 bundle
 * 的事实——React 组件进不了 Fastify。两边 import 同一份 definition，所以 schema
 * 只有一处。在模块的 client manifest 加载时调（模块文件顶层即可）。
 *
 * ```ts
 * // site-member/client/module.tsx
 * registerSiteSectionView(memberGateSection, MemberGateSection);
 * ```
 */
export function registerSiteSectionView(
  definition: SectionDefinition,
  view: ComponentType<SectionViewProps>,
  options: {
    /** 与 SSR 侧传同一份 CSS：编辑器预览注入的是同一个 `loadMarketingSiteCss()`。 */
    css?: string;
    /** 左侧区块树图标；不传则树上这一行没有 icon。 */
    icon?: LucideIcon;
  } = {},
): void {
  registerSectionDefinition(definition);
  SECTION_VIEWS[definition.type] = view;
  if (options.css) registerSectionCss(definition.type, options.css);
  if (options.icon) registerSectionIcon(definition.type, options.icon);
}
