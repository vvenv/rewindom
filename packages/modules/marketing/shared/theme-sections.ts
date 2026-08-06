/**
 * 租户官网**主题设置**（品牌色 / 字体 / 站点 Logo）。
 *
 * Section 的 schema 与解析在 `section-schema.ts`；此处只管站点级主题。
 * 编辑入口已并入「系统管理 → 品牌」页（marketing 通过 slot 注入卡片）。
 */

import { isOpaqueHex, normalizeSiteColor } from "./site-color.js";

export const THEME_FONT_FAMILIES = ["system", "serif", "mono"] as const;
export type ThemeFontFamily = (typeof THEME_FONT_FAMILIES)[number];

/** 正文最大宽度（对齐 Shopify 主题设置的 page width）。 */
export const THEME_PAGE_WIDTHS = ["compact", "default", "wide"] as const;
export type ThemePageWidth = (typeof THEME_PAGE_WIDTHS)[number];

const PAGE_WIDTH_CSS: Record<ThemePageWidth, string> = {
  compact: "64rem",
  default: "72rem",
  wide: "80rem",
};

/** 区块之间的默认间距（Shopify 的 `spacing_sections`），section 可逐段覆盖。 */
export const THEME_SECTION_SPACING = {
  min: 0,
  max: 96,
  step: 4,
  default: 16,
} as const;

export interface ThemeSettings {
  logo_url?: string | null;
  primary_color?: string | null;
  /** 整站画布背景（可带 alpha）；空 = 主题默认白底。 */
  bg_color?: string | null;
  /** 整站默认前景（可带 alpha）；空 = 主题默认近黑。 */
  fg_color?: string | null;
  font_family?: ThemeFontFamily;
  page_width?: ThemePageWidth;
  section_spacing?: number;
}

function parseOptionalColor(
  raw: unknown,
  options?: { allowAlpha?: boolean },
): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") {
    throw new Error("site.theme_settings_invalid");
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (options?.allowAlpha) {
    const normalized = normalizeSiteColor(trimmed, { allowAlpha: true });
    if (!normalized) throw new Error("site.theme_settings_invalid");
    return normalized;
  }
  if (!isOpaqueHex(trimmed)) throw new Error("site.theme_settings_invalid");
  return trimmed;
}

export function parseThemeSettings(value: unknown): ThemeSettings {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("site.theme_settings_invalid");
  }
  const raw = value as Record<string, unknown>;
  const out: ThemeSettings = {};

  if (raw.logo_url !== undefined) {
    if (raw.logo_url === null) {
      out.logo_url = null;
    } else if (typeof raw.logo_url === "string") {
      out.logo_url = raw.logo_url.trim() === "" ? null : raw.logo_url.trim();
    } else {
      throw new Error("site.theme_settings_invalid");
    }
  }

  if (raw.primary_color !== undefined) {
    out.primary_color = parseOptionalColor(raw.primary_color, {
      allowAlpha: false,
    })!;
  }

  if (raw.bg_color !== undefined) {
    out.bg_color = parseOptionalColor(raw.bg_color, { allowAlpha: true })!;
  }

  if (raw.fg_color !== undefined) {
    out.fg_color = parseOptionalColor(raw.fg_color, { allowAlpha: true })!;
  }

  if (raw.font_family !== undefined) {
    if (
      typeof raw.font_family === "string" &&
      (THEME_FONT_FAMILIES as readonly string[]).includes(raw.font_family)
    ) {
      out.font_family = raw.font_family as ThemeFontFamily;
    } else {
      throw new Error("site.theme_settings_invalid");
    }
  }

  if (raw.page_width !== undefined) {
    if (
      typeof raw.page_width === "string" &&
      (THEME_PAGE_WIDTHS as readonly string[]).includes(raw.page_width)
    ) {
      out.page_width = raw.page_width as ThemePageWidth;
    } else {
      throw new Error("site.theme_settings_invalid");
    }
  }

  if (raw.section_spacing !== undefined) {
    const { min, max, step } = THEME_SECTION_SPACING;
    const num =
      typeof raw.section_spacing === "number"
        ? raw.section_spacing
        : Number.NaN;
    if (!Number.isFinite(num) || num < min || num > max) {
      throw new Error("site.theme_settings_invalid");
    }
    out.section_spacing = Math.round(num / step) * step;
  }

  return out;
}

export function safeThemeSettings(value: unknown): ThemeSettings {
  try {
    return parseThemeSettings(value);
  } catch {
    return {};
  }
}

/**
 * 脏 JSON → 每个字段都有确定值的主题设置。
 *
 * `theme_settings` 是唯一真相源：logo / 主色曾经另有独立列，已在
 * `20260804020000_marketing_site_theme_only` 回填后删除。
 */
export function resolveThemeSettings(theme_settings: unknown): ThemeSettings {
  const fromJson = safeThemeSettings(theme_settings);
  return {
    logo_url: fromJson.logo_url ?? null,
    primary_color: fromJson.primary_color ?? null,
    bg_color: fromJson.bg_color ?? null,
    fg_color: fromJson.fg_color ?? null,
    font_family: fromJson.font_family ?? "system",
    page_width: fromJson.page_width ?? "default",
    section_spacing: fromJson.section_spacing ?? THEME_SECTION_SPACING.default,
  };
}

/** 正文最大宽度 → CSS 长度，两处渲染都注入成 `--site-page-width`。 */
export function themePageWidthCss(width: ThemePageWidth | undefined): string {
  return PAGE_WIDTH_CSS[width ?? "default"];
}

/**
 * hero 的柔光背景（`show_glow`），两处渲染共用同一段值。
 *
 * 用径向渐变而不是「模糊的圆形子元素」：渐变自带柔和边缘，不需要负偏移、
 * 不会被父级裁出一道直边，也省掉 `blur()` 在大元素上的合成开销。
 * 颜色取主题主色 `--site-accent`，两处渲染都注入了这个变量。
 */
export const HERO_GLOW_BACKGROUND =
  "radial-gradient(60% 55% at 50% 0%," +
  " color-mix(in srgb, var(--site-accent, currentColor) 18%, transparent) 0%," +
  " transparent 72%)";

export function themeFontCss(family: ThemeFontFamily | undefined): string {
  switch (family) {
    case "serif":
      return "ui-serif, Georgia, Cambria, Times New Roman, Times, serif";
    case "mono":
      return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    default:
      return "ui-sans-serif, system-ui, sans-serif";
  }
}
