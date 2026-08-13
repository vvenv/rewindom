/**
 * Section 的类型骨架：注册表、两端渲染、解析层共用的那几个形状。
 *
 * 单独成文件是为了让每个 section 自己的 `definition.ts` / `html.ts` 只依赖类型，
 * 不依赖聚合层（`./index.ts`、`./html.ts`）——否则每加一段都会多一条环。
 */

import type { SettingDef, SettingValues } from "../section-settings.js";

/** 页面级 section：可在 Theme Editor 里往页面上加。 */
export const PAGE_SECTION_TYPES = [
  "page-header",
  "hero",
  "page-menu",
  "form",
  "prose",
  "group",
  "band",
] as const;

/** 站点级区域：出现在所有页面上，各自是一串 section。 */
export const AREA_SECTION_TYPES = ["header", "footer"] as const;

/**
 * 保留类型：不由租户添加，只由解析层产生。
 *
 * `unsupported` 是「这份代码不认识的段」的容器——模块被停用、租户退订、或页面是
 * 更新的版本写的，都会撞上。它存在的唯一理由是**别把数据烧掉**：详见
 * `section-schema.ts` 的 `parsePageSection`。
 */
export const RESERVED_SECTION_TYPES = ["unsupported"] as const;

/** 段能落脚的地方：页面区块流，或页头 / 页脚区。 */
export const PLACEMENTS = ["page", "header", "footer"] as const;
export type Placement = (typeof PLACEMENTS)[number];

export type PageSectionType = (typeof PAGE_SECTION_TYPES)[number];
export type AreaSectionType = (typeof AREA_SECTION_TYPES)[number];
export type ReservedSectionType = (typeof RESERVED_SECTION_TYPES)[number];

/** 本模块自带的段。仍是闭合联合，`Record<BuiltinSectionType, …>` 的穷尽检查照旧有效。 */
export type BuiltinSectionType =
  | PageSectionType
  | AreaSectionType
  | ReservedSectionType;

/**
 * 段的 type。
 *
 * **不是闭合联合**：业务模块可以贡献自己的段（`registerSiteSectionHtml` /
 * `registerSiteSectionView`），它们的 type 在编译期无从枚举。想拿到定义一律走
 * `getSectionDefinition()`，它可能返回 `undefined`——那正是「这份代码不认识这个段」，
 * 由 `unsupported` 那套口径接住。
 */
export type SectionType = string;

export interface BlockDefinition {
  type: string;
  /** i18n key */
  label: string;
  settings: SettingDef[];
  /**
   * 容器 block：自身还持有一串子 section（`group` 的「列」）。
   * 嵌套只允许一层——容器里的子段不能再是容器段，见 `parsePageSection` 的深度闸门。
   */
  container?: true;
  /**
   * 一段里最多一个：加过之后就从「添加区块」菜单里消失。
   *
   * 给「这个东西本身只有一份」的块用——页头的品牌、语言切换、明暗切换、会员入口，
   * 页脚的版权。第二个语言切换器不是一种配置，是个一眼能看出来的错误，菜单里不该
   * 让人点得到。按钮、页脚链接列这类天生要摆好几个的**不要**声明。
   */
  singleton?: true;
  /**
   * 仅贡献块：租户开通了这项 entitlement 才可用。
   *
   * 未开通时不进页头 / 页脚的「添加区块」菜单，也不渲染。定义仍是进程级登记的，
   * 已经摆上去的块解析时不会丢掉——重新开通就回来。
   */
  entitlement?: string;
}

export interface SectionDefinition {
  type: SectionType;
  /** i18n key */
  label: string;
  /**
   * 这一段能放在哪些区域。页面区块 = `page`，页头 / 页脚区各是一个区域。
   *
   * 声明式：想让某个段既能当页面区块又能当公告条，在它的 `placements` 里多写一个
   * 区域名即可，编辑器的「添加区块」菜单与写入校验都跟着走，不用改任何分支代码。
   */
  placements: readonly Placement[];
  settings: SettingDef[];
  /** 声明后该 section 支持可重复子项。 */
  blocks?: BlockDefinition[];
  max_blocks?: number;
  /** 新建时预置的 blocks（对齐 Shopify preset）。 */
  preset_blocks?: Array<{ type: string; settings?: SettingValues }>;
  /**
   * 仅贡献段：租户开通了这项 entitlement 才可用。
   *
   * 未开通时不进「添加区块」菜单，也不渲染——已经摆在页面上的那一段会走
   * `unsupported` 口径原样兜住，重新开通就自动回来（见 `section-schema.ts`）。
   */
  entitlement?: string;
  /**
   * 这一段只在这些 kind 的页面上可用（不声明 = 哪张页面都能加）。
   *
   * 给模板页的**必备段**用：会员登录表单只在 `/member/login` 那张版式上有意义，
   * 加到普通页面上要么什么都渲染不出，要么在官网中间冒出第二个登录框。与
   * `placements` 是两个维度——那个说的是「页面流还是页头页脚」，这个说的是「哪张页面」。
   */
  page_kinds?: readonly string[];
  /**
   * 只在**默认租户**（产品站）上可用。
   *
   * 给「卖的是平台自己的东西」那类段用：平台套餐区渲染的是这套部署的定价，摆到某个
   * 租户的站点上，等于让访客在别人的站上看见并购买平台的套餐。租户要在自己站上卖东西
   * 走的是自己那份数据（如会员套餐），不是这一段。
   *
   * 与 `entitlement` 是两个维度：那个说的是「这个组织开通了没有」，这个说的是
   *「这一段属不属于这个站」。
   */
  default_tenant_only?: true;
}

/** 存储结构：section / block 都是 `{ id, type, settings }`。 */
export interface SiteBlock {
  id: string;
  type: string;
  settings: SettingValues;
  /** 仅 `container` block：列里装的子段。非容器 block 恒为 undefined。 */
  sections?: SiteSection[];
}

export interface SiteSection {
  id: string;
  type: SectionType;
  settings: SettingValues;
  blocks: SiteBlock[];
  /**
   * 仅 `unsupported` 段：原始条目**原样**留着，不做任何解读。
   *
   * 它就是这个类型存在的全部意义。停用一个贡献了 section 的模块，页面上那一段
   * 不能凭空消失——静默丢掉的话，租户下次一保存就永久没了，重新启用模块也回不来。
   */
  source?: UnsupportedSectionSource;
}

/** `unsupported` 段包住的原始条目。 */
export interface UnsupportedSectionSource {
  /** 原始 `type` 字段（可能是任意字符串）。 */
  type: string;
  /** 原始条目整体，原样透传回存储。 */
  raw: unknown;
}
