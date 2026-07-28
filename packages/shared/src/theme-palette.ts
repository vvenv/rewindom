/**
 * 主题（配色方案）注册表。
 *
 * 主题是与「明暗模式」正交的一根轴：
 * - 明暗轴由 next-themes 管理（`<html class="dark">`），仍是 light / dark / system；
 * - 配色轴由本注册表定义，落到 `<html data-theme="...">`，每个配色自带 light + dark 两套 token。
 *
 * 新增配色 = 在此追加一项 + 在 `apps/client/src/index.css` 补两个 token 块。
 * 平台默认值与租户默认值都只存 slug，校验一律走 {@link normalizeThemePalette}。
 */

export interface ThemePaletteDefinition {
  slug: string;
  label: string;
  description: string;
}

export const THEME_PALETTES = [
  {
    slug: "water",
    label: "水蓝",
    description: "默认配色：水蓝主色搭配青色数据强调",
  },
  {
    slug: "slate",
    label: "石墨",
    description: "低饱和中性灰蓝，适合长时间阅读与密集表格",
  },
] as const satisfies readonly ThemePaletteDefinition[];

export type ThemePaletteSlug = (typeof THEME_PALETTES)[number]["slug"];

/** 未做任何配置时的兜底配色，同时也是 `index.css` 里 `:root` / `.dark` 的那一套。 */
export const DEFAULT_THEME_PALETTE: ThemePaletteSlug = "water";

const PALETTE_SLUGS = new Set<string>(THEME_PALETTES.map((p) => p.slug));

export function isThemePaletteSlug(value: unknown): value is ThemePaletteSlug {
  return typeof value === "string" && PALETTE_SLUGS.has(value);
}

/** 非法/缺失值归一到 `fallback`（默认 water），保证渲染端永远拿到可用 slug。 */
export function normalizeThemePalette(
  value: unknown,
  fallback: ThemePaletteSlug = DEFAULT_THEME_PALETTE,
): ThemePaletteSlug {
  return isThemePaletteSlug(value) ? value : fallback;
}

/**
 * 归一到「slug 或继承」——租户默认主题用它：`null` 表示继承平台默认。
 */
export function normalizeOptionalThemePalette(
  value: unknown,
): ThemePaletteSlug | null {
  return isThemePaletteSlug(value) ? value : null;
}

export function getThemePaletteLabel(slug: string): string {
  return THEME_PALETTES.find((p) => p.slug === slug)?.label ?? slug;
}
