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
import { docArticleSection } from "./doc-article/definition.js";
import { docListSection } from "./doc-list/definition.js";
import { docNavSection } from "./doc-nav/definition.js";
import { docTocSection } from "./doc-toc/definition.js";
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
  type BuiltinSectionType,
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
  fitGroupSpans,
  formatGroupSpans,
  GROUP_GRID,
  layoutSettings,
  parseGroupSpans,
  refitGroupSpans,
  resolveGroupSpans,
  splitSettingsByScope,
  styleSettings,
} from "./_common/settings.js";

/**
 * 本模块自带的段。
 *
 * 业务模块贡献的段**不在这里**——它们在运行时注册进 `CONTRIBUTED`，见本文件末尾。
 * 保持这张表是闭合的 `Record<BuiltinSectionType, …>`，加内置段漏一项编译期就会报。
 */
export const BUILTIN_SECTION_DEFINITIONS: Record<
  BuiltinSectionType,
  SectionDefinition
> = {
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
  "doc-list": docListSection,
  "doc-article": docArticleSection,
  "doc-nav": docNavSection,
  "doc-toc": docTocSection,
  group: groupSection,
  band: bandSection,
  /* 保留：只由解析层产生，`placements: []` 保证它不出现在任何添加菜单里 */
  unsupported: unsupportedSection,
};

/* -------------------------------------------------------------------------- */
/* 业务模块贡献的段                                                            */
/* -------------------------------------------------------------------------- */

/**
 * 贡献进来的段定义。
 *
 * 方向与 `site-account-entry` 一致：注册表定义在**消费方**（marketing），业务模块
 * 自己把定义填进来。marketing 不知道任何业务模块的存在，也不反向 import——依赖图
 * 只有一条边（业务模块 `requires: ["marketing"]`）。
 *
 * 这里只存**定义**。两端渲染各自注册（SSR 走 `registerSiteSectionHtml`，
 * 编辑器视图走 `registerSiteSectionView`），因为客户端与服务端本来就是两个 bundle
 * ——React 组件进不了 Fastify。那两个函数都会顺手把定义登记到这里，所以贡献方
 * 只需要维护**一份** definition 对象，两边 import 同一个，不会漂。
 */
const CONTRIBUTED = new Map<string, SectionDefinition>();

/**
 * 登记一个贡献段的定义（幂等）。
 *
 * `type` 必须带模块前缀（如 `site-member.gate`）：段 type 会落进租户页面的存储里，
 * 两个模块撞名的后果是页面内容被另一个模块的 schema 解析——所以撞名直接抛，
 * 在启动时炸掉远好过在某个租户的页面上悄悄错乱。
 */
export function registerSectionDefinition(definition: SectionDefinition): void {
  const existing = CONTRIBUTED.get(definition.type);
  if (existing && existing !== definition) {
    throw new Error(`site.section_type_conflict:${definition.type}`);
  }
  if (Object.hasOwn(BUILTIN_SECTION_DEFINITIONS, definition.type)) {
    throw new Error(`site.section_type_conflict:${definition.type}`);
  }
  CONTRIBUTED.set(definition.type, definition);
}

/** 仅供测试：清空贡献表。 */
export function resetSectionContributions(): void {
  CONTRIBUTED.clear();
}

/* -------------------------------------------------------------------------- */

/**
 * 拿一个段的定义 —— **所有查表都该走这里**，别再直接索引 `BUILTIN_SECTION_DEFINITIONS`。
 *
 * 返回 `undefined` 就是「这份代码不认识这个段」：模块停用、租户退订、页面是更新版本
 * 写的，都会走到这一支，由 `unsupported` 那套口径接住（见 `section-schema.ts`）。
 */
export function getSectionDefinition(
  type: BuiltinSectionType,
): SectionDefinition;
export function getSectionDefinition(
  type: string,
): SectionDefinition | undefined;
export function getSectionDefinition(
  type: string,
): SectionDefinition | undefined {
  return Object.hasOwn(BUILTIN_SECTION_DEFINITIONS, type)
    ? BUILTIN_SECTION_DEFINITIONS[type as BuiltinSectionType]
    : CONTRIBUTED.get(type);
}

/** 内置段 + 已贡献段的全表（编辑器菜单、校验白名单用）。 */
export function allSectionDefinitions(): SectionDefinition[] {
  return [
    ...Object.values(BUILTIN_SECTION_DEFINITIONS),
    ...CONTRIBUTED.values(),
  ];
}

/**
 * 能往页面段流里放的 type。
 *
 * 贡献段按 `placements` 判断，与内置段同一口径——这样「课程模块贡献一个只能放页面里
 * 的段」不需要在任何地方加分支。
 */
export function isPageSectionType(value: unknown): value is PageSectionType {
  if (typeof value !== "string") return false;
  if ((PAGE_SECTION_TYPES as readonly string[]).includes(value)) return true;
  return Boolean(CONTRIBUTED.get(value)?.placements.includes("page"));
}

/**
 * 某个区域能放哪些段——编辑器的「添加区块」菜单与写入校验共用。
 *
 * `enabled` 给编辑器用：贡献段可以声明 `entitlement`，租户没开通就不该出现在菜单里
 *（列了也加不出可用的东西）。不传则不过滤，渲染与校验路径走这一支。
 *
 * `pageKind` 同理管 `page_kinds`：会员登录表单那种段只在它自己那张模板页上有意义，
 * 加到普通页面上要么渲染不出东西，要么渲染出第二个登录框。不传则不按 kind 过滤。
 */
export function sectionTypesFor(
  placement: Placement,
  enabled?: ReadonlySet<string>,
  pageKind?: string,
): SectionType[] {
  return allSectionDefinitions()
    .filter(
      (def) =>
        def.placements.includes(placement) &&
        (!def.entitlement || !enabled || enabled.has(def.entitlement)) &&
        (!def.page_kinds ||
          pageKind === undefined ||
          def.page_kinds.includes(pageKind)),
    )
    .map((def) => def.type);
}

export function isAreaSectionType(value: unknown): value is AreaSectionType {
  return (
    typeof value === "string" &&
    (AREA_SECTION_TYPES as readonly string[]).includes(value)
  );
}

/** 该 section 的 block 是否装子段（目前只有 `group` 的列）。 */
export function isContainerSection(type: string): boolean {
  return Boolean(
    getSectionDefinition(type)?.blocks?.some((def) => def.container),
  );
}

export function getBlockDefinition(
  sectionType: string,
  blockType: string,
): BlockDefinition | undefined {
  return getSectionDefinition(sectionType)?.blocks?.find(
    (block) => block.type === blockType,
  );
}
