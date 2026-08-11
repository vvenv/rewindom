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
 * 模板页在 DB 里可以**不存在**：那时由各自的 SSR 用内置预设版式渲染。不为每个租户
 * 预建空页，也就不需要数据迁移——「没有记录」是常态，不是异常。
 */

import { DOCS_INDEX_PATH } from "./marketing-doc.js";

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
  /** 中台页面列表里的分组标题（i18n key，贡献方用带命名空间的 key）。 */
  group: string;
  /** 这张模板页的名字（i18n key）。 */
  label: string;
  /**
   * 必备段的 type：编辑器不给删，服务端保存时校验必须有且仅有一段。
   *
   * 它是这张模板存在的理由本身——登录版式里删掉登录表单，会员就再也登不进来了。
   * `null` 表示没有必备段（文档模板页就是：`doc-*` 段删光了只是页面空着）。
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
 * 上就要用到（校验 slug、算页面路径），预设版式只有中台「自定义版式」按钮与 SSR
 * 兜底渲染要。分开之后 `page-templates` 不必 import `page-presets`，也就不会与
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
 * 模板页一旦落库也**不可删除**（只许重设预设）——首页、文档版式等由系统初始化或
 * 「自定义版式」建出，删掉就失去对应路由上的可编辑版式。
 */
export function isTemplatePageKind(kind: string): boolean {
  return TEMPLATE_KINDS.has(kind);
}

/* -------------------------------------------------------------------------- */
/* marketing 自带的模板页：租户文档库的两张版式                                */
/* -------------------------------------------------------------------------- */

export const DOC_TEMPLATE_KINDS = ["doc_index", "doc_article"] as const;
export type DocTemplateKind = (typeof DOC_TEMPLATE_KINDS)[number];

/** 模板页的固定 slug：同 `home`——kind 唯一，slug 不由租户填。 */
export const DOC_TEMPLATE_SLUGS: Record<DocTemplateKind, string> = {
  doc_index: "docs",
  doc_article: "docs-article",
};

export function isDocTemplateKind(kind: string): kind is DocTemplateKind {
  return kind === "doc_index" || kind === "doc_article";
}

/* -------------------------------------------------------------------------- */
/* 首页：kind 唯一、slug 固定，默认不落库，SSR 用内置三段式版式兜底            */
/* -------------------------------------------------------------------------- */

registerPageTemplateKind({
  kind: "home",
  slug: "home",
  path: "/",
  group: "cms.homeTemplate",
  label: "preset.home.label",
  required_section: null,
});

registerPageTemplateKind({
  kind: "doc_index",
  slug: DOC_TEMPLATE_SLUGS.doc_index,
  path: DOCS_INDEX_PATH,
  group: "cms.docTemplates",
  label: "cms.kindDocIndex",
  required_section: null,
});

registerPageTemplateKind({
  kind: "doc_article",
  slug: DOC_TEMPLATE_SLUGS.doc_article,
  path: `${DOCS_INDEX_PATH}/:slug`,
  group: "cms.docTemplates",
  label: "cms.kindDocArticle",
  required_section: null,
});
