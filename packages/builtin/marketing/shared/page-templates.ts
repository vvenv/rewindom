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
 * 打开 `/app/site`）；声明 `auto_init: false` 的除外——那些等租户在中台点「初始化版式」，
 * 或等它的 entitlement 由关变开。SSR 仍能在记录尚未落库时用内置预设兜底。
 */

import {
  APP_LOCALES,
  normalizeLocale,
  translateRegisteredKey,
  type AppLocale,
} from "@rewindom/shared";

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
  /**
   * 建租户 / 打开 `/app/site` 时要不要**自动**快照落库。缺省 `true`。
   *
   * `false` 的模板只在两个时刻落库：租户在中台常驻模板区点「初始化版式」，或它声明的
   * `entitlement` 由关变开（安装 / 启用那项功能的那一刻）。用于那些「站点未必要用」的
   * 版式——首页、会员登录 / 注册 / 账户：预建出来的空版式对不做这块的站点只是噪音，
   * 页面列表里还删不掉（模板页不可删）。
   *
   * 未落库不影响访客：SSR 仍按内置预设兜底渲染。反过来，像 404 这种**每个**站点都
   * 需要、且租户迟早要改的版式，留在自动落库里更省事。
   */
  auto_init?: boolean;
  /**
   * 是否进公开导航目录（「全部一级页面」、`page-menu`）。
   *
   * 未声明时按路径形状推断：可打开的一级地址进，首页 / 详情模板 / 二级功能页不进。
   * 404 是一级地址但不是入口——死链页不该出现在导航里，所以显式关掉。
   */
  in_catalog?: boolean;
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
 * 中台普通页面列表 / 排序 / 复制规则按它排除模板页：模板页没有租户自填的地址，
 * 混进那些列表里会给出「可以改 slug」「可以拖排序」的错误暗示。
 *
 * 公开导航目录不走这一条——见 `isPublicCatalogPageKind`。
 *
 * 模板页一旦落库也**不可删除**（只许重设预设）——由系统在相关时快照建出，
 * 删掉就失去对应路由上的可编辑版式。
 */
export function isTemplatePageKind(kind: string): boolean {
  return TEMPLATE_KINDS.has(kind);
}

/**
 * 这张模板管的是不是一条**可打开的一级地址**（`/docs`、`/shop`）。
 *
 * `/` 是首页（页头品牌链）；带 `:param` 的是详情版式；`/shop/cart` 这类是二级
 * 功能页。这三类都不是「全部一级页面」该列的站点目录成员。
 */
export function isFirstLevelCatalogPath(path: string): boolean {
  if (!path.startsWith("/") || path === "/") return false;
  if (path.includes(":")) return false;
  return !path.slice(1).includes("/");
}

/**
 * 公开页面目录收哪些 kind——「全部一级页面」、`page-menu` 都吃它。
 *
 * 普通 `page` 全收。模板页只收可打开的一级地址：文档索引、商店首页访客本来就会
 * 当一级入口用；详情模板没有自己的地址，会员登录 / 购物车也不是目录页。
 *
 * 只看路径形状，**不管**模块开没开。真正进导航 / 公开 `pages` 还要过
 * `isPublicCatalogPage`（未开通的商店 / 文档库不能出现在访客导航里）。
 */
export function isPublicCatalogPageKind(kind: string): boolean {
  if (!isTemplatePageKind(kind)) return true;
  const template = getPageTemplateKind(kind);
  if (!template) return false;
  if (template.in_catalog === false) return false;
  if (template.in_catalog === true) return true;
  return isFirstLevelCatalogPath(template.path);
}

/**
 * 这张页面现在能不能进公开目录（导航、「全部一级页面」、`page-menu`）。
 *
 * kind 形状过了还要看模板的 entitlement：开关关了，落库的 `/shop` `/docs`
 * 仍在，但不能再当一级入口。没传集合按**未开通**算——漏传会少、不会多。
 */
export function isPublicCatalogPage(
  kind: string,
  enabledEntitlements?: ReadonlySet<string>,
): boolean {
  if (!isPublicCatalogPageKind(kind)) return false;
  const template = getPageTemplateKind(kind);
  if (!template) return true;
  return isPageTemplateRelevant(template, enabledEntitlements ?? new Set());
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

/**
 * 这张模板要不要在「相关」的那一刻自动快照落库。
 *
 * 与 `isPageTemplateRelevant` 分开的两问：相关的是「站点用不用得上这张页」，这一条
 * 是「用得上的话要不要替租户先建出来」。中台露出看前者，落库看两者。
 */
export function isPageTemplateAutoInit(
  template: PageTemplateKindDefinition,
): boolean {
  return template.auto_init !== false;
}

/**
 * 公开目录要展开的那些行：当前语言自己的页面 + 当前语言还没有、但 SSR 仍能打开的
 * 一级模板页（`/shop`、`/docs`）。
 *
 * 普通页面（关于、定价）缺译文就不进另一种语言的导航——否则中文「关于」会挂在
 * 英文菜单上。模板页不一样：路由按 kind 兜底，不建英文行也能打开 `/en/shop`，
 * 菜单里就该有这一条，标题走预设文案而不是默认语言那一行存下来的中文。
 */
export function publicCatalogSources<
  T extends { kind: string; slug: string; locale: string },
>(
  pages: readonly T[],
  current: AppLocale,
  defaultLocale: AppLocale,
  enabledEntitlements?: ReadonlySet<string>,
): Array<{ page: T; localizeFromPreset: boolean }> {
  const currentNorm = normalizeLocale(current, defaultLocale);
  const defaultNorm = normalizeLocale(defaultLocale);
  const eligible = (page: T): boolean =>
    isPublicCatalogPage(page.kind, enabledEntitlements);
  const ofLocale = (locale: AppLocale): T[] =>
    pages.filter(
      (page) =>
        eligible(page) &&
        normalizeLocale(page.locale, defaultNorm) === locale,
    );

  const currentPages = ofLocale(currentNorm);
  const hits = currentPages.map((page) => ({
    page,
    localizeFromPreset: false,
  }));
  if (currentNorm === defaultNorm) return hits;

  const seen = new Set(currentPages.map((page) => `${page.kind}:${page.slug}`));
  const borrowed = ofLocale(defaultNorm)
    .filter(
      (page) =>
        isTemplatePageKind(page.kind) && !seen.has(`${page.kind}:${page.slug}`),
    )
    .map((page) => ({ page, localizeFromPreset: true as const }));
  return [...hits, ...borrowed];
}

/**
 * 模板页在「借用默认语言那一行」时的标题 / 摘要：按**当前语言**解预设 key。
 *
 * 解不开（catalog 没登记、key 原样返回）就让调用方继续用库存文案，别把
 * `shop:storefront.catalog.title` 写进导航。
 */
export function resolveTemplatePresetCopy(
  kind: string,
  locale: AppLocale,
  t?: (key: string) => string,
): { title: string; description: string } | null {
  const preset = getPageTemplatePreset(kind);
  if (!preset) return null;
  const translate =
    t ?? ((key: string) => translateRegisteredKey(locale, key) ?? key);
  const title = translate(preset.titleKey).trim();
  if (!title || title === preset.titleKey) return null;
  const description = translate(preset.descriptionKey).trim();
  return {
    title,
    description:
      !description || description === preset.descriptionKey ? "" : description,
  };
}

/**
 * 改过译名的预设：库里仍可能是旧默认值。这些和各语言当前预设文案一样，
 * 都算「还没被租户改过」，公开导航按**当前语言**重解，不能把中文「商品」
 * 留在英文菜单上——复制到 en 的模板页标题经常还是源语言原文。
 */
const RETIRED_PRESET_TITLES: Readonly<Record<string, readonly string[]>> = {
  "shop:storefront.catalog.title": ["商品", "Products"],
  "events:site.detail.title": ["Event", "事件详情"],
  "events:site.detail.subtitle": [
    "What happened, how it developed, and the evidence",
    "发生了什么、怎么发展到现在、证据在哪",
  ],
  "events:site.entity.title": ["Entity", "实体"],
  "events:site.entity.subtitle": [
    "Every event involving this company, product or person",
    "这个公司 / 产品 / 人物涉及的全部事件",
  ],
  "shop:storefront.product.title": ["Product", "商品"],
  "shop:storefront.product.subtitle": ["Product details", "商品详情"],
  "shop:storefront.collection.title": ["Collection", "分类"],
  "shop:storefront.collection.subtitle": [
    "Products in this collection",
    "该分类下的商品",
  ],
  "shop:storefront.order.title": ["Order", "订单"],
  "shop:storefront.order.pageTitle": ["Order", "订单"],
  "site-docs:template.article.title": ["Doc detail", "文档详情"],
  "site-docs:template.article.description": [
    "Layout for a single document (shared by every /docs/… address).",
    "单篇文档的版式（所有 /docs/… 地址共用）。",
  ],
};

function isStockPresetString(key: string, stored: string): boolean {
  const trimmed = stored.trim();
  if (!trimmed || trimmed === key) return true;
  if (RETIRED_PRESET_TITLES[key]?.includes(trimmed) === true) return true;
  return APP_LOCALES.some((locale) => {
    const text = translateRegisteredKey(locale.slug, key);
    return Boolean(text) && text === trimmed;
  });
}

export function isStockTemplateTitle(kind: string, title: string): boolean {
  const preset = getPageTemplatePreset(kind);
  if (!preset) return false;
  return isStockPresetString(preset.titleKey, title);
}

export function isStockTemplateDescription(
  kind: string,
  description: string,
): boolean {
  const preset = getPageTemplatePreset(kind);
  if (!preset) return false;
  return isStockPresetString(preset.descriptionKey, description);
}

/**
 * 复制到另一语言：库存标题 / 摘要换成目标语言 catalog 句，租户改过的原样当翻译起点。
 */
export function relocalizeStockTemplateTitle(
  kind: string,
  stored: string,
  to: AppLocale,
): string {
  if (!isStockTemplateTitle(kind, stored)) return stored;
  return resolveTemplatePresetCopy(kind, to)?.title ?? stored;
}

export function relocalizeStockTemplateDescription(
  kind: string,
  stored: string,
  to: AppLocale,
): string {
  if (!isStockTemplateDescription(kind, stored)) return stored;
  return resolveTemplatePresetCopy(kind, to)?.description ?? stored;
}

/**
 * 中台读路径：库存标题 / 摘要（含误存的 `ns:key`）按当前语言解预设；租户改过的原样。
 * 普通页没有预设，等于原样返回。
 */
export function resolveEditorTemplateCopy(
  kind: string,
  locale: AppLocale,
  stored: { title: string; description: string },
): { title: string; description: string } {
  return {
    title: resolveCatalogPageTitle(kind, locale, stored.title),
    description: resolveCatalogPageDescription(
      kind,
      locale,
      stored.description,
    ),
  };
}

/**
 * 公开目录 / 页头导航用的模板页标题。
 *
 * 库存标题还是预设默认值（含旧译名）时，按**当前浏览语言**解；租户改过的
 * 标题只在「这一行就是当前语言」时保留。借用另一语言的行时一律走预设。
 */
export function resolveCatalogPageTitle(
  kind: string,
  viewingLocale: AppLocale,
  storedTitle: string,
  options?: { forcePreset?: boolean; t?: (key: string) => string },
): string {
  const stored = storedTitle.trim();
  const copy = resolveTemplatePresetCopy(kind, viewingLocale, options?.t);
  if (!copy) return stored;
  if (options?.forcePreset === true || isStockTemplateTitle(kind, stored)) {
    return copy.title;
  }
  return stored;
}

/**
 * 与 `resolveCatalogPageTitle` 同一条库存口径：旧默认描述按当前语言重解。
 */
export function resolveCatalogPageDescription(
  kind: string,
  viewingLocale: AppLocale,
  storedDescription: string,
  options?: { forcePreset?: boolean; t?: (key: string) => string },
): string {
  const stored = storedDescription.trim();
  const copy = resolveTemplatePresetCopy(kind, viewingLocale, options?.t);
  if (!copy) return stored;
  if (
    options?.forcePreset === true ||
    isStockTemplateDescription(kind, stored)
  ) {
    return copy.description;
  }
  return stored;
}

/* -------------------------------------------------------------------------- */
/* marketing 自带的模板页：首页、404                                            */
/* -------------------------------------------------------------------------- */

export const HOME_PAGE_KIND = "home";
export const NOT_FOUND_PAGE_KIND = "not_found";
export const NOT_FOUND_TEMPLATE_SLUG = "404";
export const NOT_FOUND_PATH = "/404";

/*
 * 首页不自动落库：没落库时 SSR 按当前首页版式（`home_layout_key`）兜底渲染，与预建
 * 一条空版式记录对访客毫无差别，却省掉了「每个新站点都先有一张没人动过的首页」。
 * 租户在站点设置里套用一套首页版式，或在模板区点「初始化版式」，那一刻才落库。
 */
registerPageTemplateKind({
  kind: HOME_PAGE_KIND,
  slug: "home",
  path: "/",
  group: "cms.homeTemplate",
  label: "preset.home.label",
  required_section: null,
  auto_init: false,
});

registerPageTemplateKind({
  kind: NOT_FOUND_PAGE_KIND,
  slug: NOT_FOUND_TEMPLATE_SLUG,
  path: NOT_FOUND_PATH,
  group: "cms.notFoundTemplate",
  label: "preset.not_found.label",
  // 字符串而不是 import：`page-missing` 的 definition 反过来认 NOT_FOUND_PAGE_KIND。
  required_section: "page-missing",
  in_catalog: false,
});
