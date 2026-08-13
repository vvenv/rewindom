/**
 * 模板页种类的注册表 —— 「kind 唯一、slug 固定」的那一类页面。
 *
 * 模板页与普通页面只差三条：地址不由租户填（kind 决定 slug）、每种语言最多一张、
 * 页面上有一段**必备段**（删掉这张模板就失去意义）。版式本身仍是普通的 section 流，
 * 租户在同一个编辑器里排、同一套发布流程上线。
 *
 * 注册表定义在 marketing，业务模块自己把定义填进来——方向同 `registerSectionDefinition`：
 * `/member/login` 的版式属于 site-member，marketing 不该认识「会员」这个概念，
 * 依赖图上仍只有一条边（业务模块 `requires: ["marketing"]`）。
 *
 * 对该站点变得相关时由 `initializeTenantSite` 快照进 DB（建租户、开通 entitlement、
 * 打开 `/app/site`）。SSR 仍能在记录尚未落库时用内置预设兜底，那是缺口不是产品路径。
 */

import type { PagePreset } from "./page-presets.types.js";

export interface PageTemplateKindDefinition {
  /**
   * 页面 kind，原样落进 `MarketingPage.kind`。
   *
   * 撞名直接抛：kind 决定了这张页面按谁的规则解析与渲染，两个模块共用一个 kind
   * 的后果是租户的版式被另一个模块接管。启动时炸掉远好过线上悄悄错乱。
   */
  kind: string;
  /** 固定 slug：kind 唯一，租户改不了（改了地址就路由不到了）。 */
  slug: string;
  /**
   * 这张模板管的逻辑路径。
   *
   * 可以是一个**模板路径**（`/docs/:slug`）而不是能打开的地址——那张页面对应的是
   * 「所有文档详情」，中台拿它显示「这一页管的是哪一段地址」。
   */
  path: string;
  /**
   * 中台常驻模板区的分组标题（i18n key，贡献方用带命名空间的 key）。
   *
   * **同一 key = 同一组**：跨模块贡献的模板若同属一个产品概念（如全部 `/member/*`），
   * 必须共用这一个 key，由概念归属方持有文案；各写一份「碰巧相同」的文案会在中台
   * 渲染出两个同名分组。
   */
  group: string;
  /** 这张模板页的名字（i18n key）。 */
  label: string;
  /**
   * 必备段的 type：编辑器不给删，服务端保存时校验必须有且仅有一段。
   *
   * 它是这张模板存在的理由本身——登录版式里删掉登录表单，会员就再也登不进来了。
   * `null` 表示没有必备段（首页就是：段删光了只是页面空着）。
   */
  required_section: string | null;
  /** 仅贡献的模板页：租户开通了这项 entitlement 才在中台露出。 */
  entitlement?: string;
}

const TEMPLATE_KINDS = new Map<string, PageTemplateKindDefinition>();

/**
 * 各模板页的内置预设版式。
 *
 * 与定义分开登记，是因为两者的可见范围不同：`slug` / `path` 这些元数据在**写路径**
 * 上就要用到（校验 slug、算页面路径），预设版式给快照落库、「重设为最新版式」与
 * SSR 兜底用。分开之后 `page-templates` 不必 import `page-presets`，也就不会与
 * `site-cms` 连成环。
 */
const TEMPLATE_PRESETS = new Map<string, PagePreset>();

/** 登记一个模板页种类（幂等）。 */
export function registerPageTemplateKind(
  definition: PageTemplateKindDefinition,
): void {
  const existing = TEMPLATE_KINDS.get(definition.kind);
  if (existing && existing !== definition) {
    throw new Error(`site.page_kind_conflict:${definition.kind}`);
  }
  TEMPLATE_KINDS.set(definition.kind, definition);
}

/** 登记某个模板页种类的内置预设版式（幂等覆盖）。 */
export function registerPageTemplatePreset(
  kind: string,
  preset: PagePreset,
): void {
  TEMPLATE_PRESETS.set(kind, preset);
}

export function getPageTemplateKind(
  kind: string,
): PageTemplateKindDefinition | undefined {
  return TEMPLATE_KINDS.get(kind);
}

export function getPageTemplatePreset(kind: string): PagePreset | undefined {
  return TEMPLATE_PRESETS.get(kind);
}

/** 登记顺序即中台列表顺序（marketing 自带的在前，贡献的按注册先后排在后面）。 */
export function listPageTemplateKinds(): PageTemplateKindDefinition[] {
  return [...TEMPLATE_KINDS.values()];
}

/**
 * 是不是模板页。
 *
 * 普通页面列表 / 排序 / 站点导航 / 复制规则都按它排除模板页：模板页没有租户自填的
 * 地址，混进那些列表里会给出「可以改 slug」「可以拖排序」的错误暗示。
 *
 * 模板页一旦落库也**不可删除**（只许重设预设）——由系统在相关时快照建出，
 * 删掉就失去对应路由上的可编辑版式。
 */
export function isTemplatePageKind(kind: string): boolean {
  return TEMPLATE_KINDS.has(kind);
}

/**
 * 这张模板页现在对这个站点是否相关。
 *
 * 没有 `entitlement` 的常驻（首页）；声明了的要等对应开关打开。
 * 中台列表、快照落库、SSR 露出都走这一条，避免三处各写一个「要不要出现」。
 */
export function isPageTemplateRelevant(
  template: PageTemplateKindDefinition,
  enabledEntitlements: ReadonlySet<string>,
): boolean {
  return !template.entitlement || enabledEntitlements.has(template.entitlement);
}

/* -------------------------------------------------------------------------- */
/* marketing 自带的模板页：首页                                                */
/* -------------------------------------------------------------------------- */

registerPageTemplateKind({
  kind: "home",
  slug: "home",
  path: "/",
  group: "cms.homeTemplate",
  label: "preset.home.label",
  required_section: null,
});
