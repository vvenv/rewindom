/**
 * Section 注册表 —— section / block 的**唯一真相源**。
 *
 * 每个 section 是一个目录：`<type>/definition.ts` 是 schema，`<type>/html.ts` 是 SSR
 * 渲染，客户端的 React 视图在 `client/components/sections/views/<type>.tsx`。
 * 本文件只做聚合，不含任何一段的具体内容——**加一段不改这里的任何逻辑，只多一行**。
 *
 * 覆盖面以「能配出默认官网的效果」为准：hero + 特性网格 + 步骤 + 规格表 +
 * 卡片 + 页面菜单 + 定价 + FAQ + 通栏 CTA，外加站点级的页头 / 页脚。
 */

import { bandSection } from "./band/definition.js";
import { cardsSection } from "./cards/definition.js";
import { faqSection } from "./faq/definition.js";
import { featureGridSection } from "./feature-grid/definition.js";
import { footerSection } from "./footer/definition.js";
import { formSection } from "./form/definition.js";
import { groupSection } from "./group/definition.js";
import { headerSection } from "./header/definition.js";
import { heroSection } from "./hero/definition.js";
import { pageHeaderSection } from "./page-header/definition.js";
import { pageMenuSection } from "./page-menu/definition.js";
import { pricingSection } from "./pricing/definition.js";
import { proseSection } from "./prose/definition.js";
import { specListSection } from "./spec-list/definition.js";
import { stepsSection } from "./steps/definition.js";
import {
  AREA_SECTION_TYPES,
  PAGE_SECTION_TYPES,
  type AreaSectionType,
  type BlockDefinition,
  type PageSectionType,
  type Placement,
  type SectionDefinition,
  type SectionType,
} from "./types.js";
import { unsupportedSection } from "./unsupported/definition.js";

export * from "./types.js";
// `render-context.js` 刻意不在这里 re-export：它引 `site-cms`，而 `site-cms` 引
// `section-schema`（后者 re-export 本文件）——转出去就成环。要它的从 `./html.js` 拿。
export {
  layoutSettings,
  resolveGroupSpans,
  splitSettingsByScope,
  styleSettings,
} from "./_common/settings.js";

export const SECTION_DEFINITIONS: Record<SectionType, SectionDefinition> = {
  /* 站点级 */
  header: headerSection,
  footer: footerSection,
  /* 页面级 */
  "page-header": pageHeaderSection,
  hero: heroSection,
  "feature-grid": featureGridSection,
  steps: stepsSection,
  "spec-list": specListSection,
  cards: cardsSection,
  "page-menu": pageMenuSection,
  pricing: pricingSection,
  faq: faqSection,
  form: formSection,
  prose: proseSection,
  group: groupSection,
  band: bandSection,
  /* 保留：只由解析层产生，`placements: []` 保证它不出现在任何添加菜单里 */
  unsupported: unsupportedSection,
};

export function isPageSectionType(value: unknown): value is PageSectionType {
  return (
    typeof value === "string" &&
    (PAGE_SECTION_TYPES as readonly string[]).includes(value)
  );
}

/** 某个区域能放哪些段——编辑器的「添加区块」菜单与写入校验共用。 */
export function sectionTypesFor(placement: Placement): SectionType[] {
  return (Object.keys(SECTION_DEFINITIONS) as SectionType[]).filter((type) =>
    SECTION_DEFINITIONS[type].placements.includes(placement),
  );
}

export function isAreaSectionType(value: unknown): value is AreaSectionType {
  return (
    typeof value === "string" &&
    (AREA_SECTION_TYPES as readonly string[]).includes(value)
  );
}

export function getSectionDefinition(type: SectionType): SectionDefinition {
  return SECTION_DEFINITIONS[type];
}

/** 该 section 的 block 是否装子段（目前只有 `group` 的列）。 */
export function isContainerSection(type: SectionType): boolean {
  return Boolean(SECTION_DEFINITIONS[type].blocks?.some((def) => def.container));
}

export function getBlockDefinition(
  sectionType: SectionType,
  blockType: string,
): BlockDefinition | undefined {
  return SECTION_DEFINITIONS[sectionType].blocks?.find(
    (block) => block.type === blockType,
  );
}
