/**
 * 首页版式注册表 —— 业务模块给 `kind: home`（路径 `/`）贡献一套可套用的段组合。
 *
 * 与模板页不同：模板页是「kind 唯一、slug 固定」的另一张页面（`/events`、`/shop`）；
 * 首页版式是**同一张**首页上的备选结构。租户在站点设置的「首页」里选一套，
 * 草稿被换成该预设，「重设为最新版式」与 SSR 兜底都按当前选中的 key 走。
 *
 * 注册表定义在 marketing，模块自己填（同 `registerPageTemplateKind`）。
 * 选择器把版式和「把另一张页占据 /」合成一项：选版式时 `home_path` 回到 `/`。
 */

import { HOME_PAGE_KIND } from "./page-templates.js";

import type { PagePreset } from "./page-presets.types.js";

export const DEFAULT_HOME_LAYOUT_KEY = "marketing.default";

export interface HomeLayoutDefinition {
  /**
   * 稳定 key，落进 `MarketingSite.home_layout_key`。
   *
   * 带模块前缀（`events.home`）。撞名直接抛：两个模块共用一个 key 会让租户
   * 选中的版式被对方接管。
   */
  key: string;
  /** 选择器上的名字（i18n key，贡献方用带命名空间的 key）。 */
  label: string;
  /** 选择器下的一句说明（i18n key）。 */
  description?: string;
  /** 有租户开关则未开通不进选择器、也不能套用。 */
  entitlement?: string;
  /**
   * 这套版式接管站点根时，对应枢纽的公开前缀（如 `/events`）。
   *
   * 选择器不再把该路径列为「把某页设为首页」；公开面是否把前缀收到 `/`
   * 由贡献模块按 `home_layout_key` 判定。存量 `home_path` 等于此前缀时，
   * 选择器仍认作已选这套版式。
   */
  rootPrefix?: string;
  /**
   * 版式本身。`kind` 必须是 `home`——登记到别的 kind 上没有调用方会去取。
   */
  preset: PagePreset;
}

const HOME_LAYOUTS = new Map<string, HomeLayoutDefinition>();

/** 登记一套首页版式（幂等：同一引用再登记一次不抛）。 */
export function registerHomeLayout(definition: HomeLayoutDefinition): void {
  if (definition.preset.kind !== HOME_PAGE_KIND) {
    throw new Error(`site.home_layout_kind:${definition.key}`);
  }
  const existing = HOME_LAYOUTS.get(definition.key);
  if (existing && existing !== definition) {
    throw new Error(`site.home_layout_conflict:${definition.key}`);
  }
  HOME_LAYOUTS.set(definition.key, definition);
}

export function getHomeLayout(key: string): HomeLayoutDefinition | undefined {
  return HOME_LAYOUTS.get(key);
}

export function isHomeLayoutRelevant(
  layout: HomeLayoutDefinition,
  enabledEntitlements: ReadonlySet<string>,
): boolean {
  return !layout.entitlement || enabledEntitlements.has(layout.entitlement);
}

/**
 * 当前站点能套用的首页版式。登记顺序即选择器顺序（marketing 默认在前）。
 *
 * 没传开通集合按**未开通**算——漏传会少、不会多。
 */
export function listHomeLayouts(
  enabledEntitlements: ReadonlySet<string> = new Set(),
): HomeLayoutDefinition[] {
  return [...HOME_LAYOUTS.values()].filter((layout) =>
    isHomeLayoutRelevant(layout, enabledEntitlements),
  );
}

/**
 * 按站点记下的 key 取版式；key 空了、开关关了、或登记被撤了，回落到起步首页。
 */
export function resolveHomeLayout(
  key: string | null | undefined,
  enabledEntitlements: ReadonlySet<string> = new Set(),
): HomeLayoutDefinition {
  if (key) {
    const layout = HOME_LAYOUTS.get(key);
    if (layout && isHomeLayoutRelevant(layout, enabledEntitlements)) {
      return layout;
    }
  }
  const fallback = HOME_LAYOUTS.get(DEFAULT_HOME_LAYOUT_KEY);
  if (!fallback) {
    throw new Error("site.home_layout_missing_default");
  }
  return fallback;
}
