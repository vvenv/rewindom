/**
 * 租户官网**主题设置**（品牌色 / 字体 / 站点 Logo）。
 *
 * Section 的 schema 与解析在 `section-schema.ts`；此处只管站点级主题。
 * 编辑入口已并入「系统管理 → 品牌」页（marketing 通过 slot 注入卡片）。
 */

export const THEME_FONT_FAMILIES = ["system", "serif", "mono"] as const;
export type ThemeFontFamily = (typeof THEME_FONT_FAMILIES)[number];

/** 嵌套页面的同级页面菜单：放左侧 / 放右侧 / 不显示。 */
export const THEME_PAGE_NAV_POSITIONS = ["left", "right", "off"] as const;
export type ThemePageNav = (typeof THEME_PAGE_NAV_POSITIONS)[number];

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
  font_family?: ThemeFontFamily;
  page_nav?: ThemePageNav;
  page_width?: ThemePageWidth;
  section_spacing?: number;
}

const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u;

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
    if (raw.primary_color === null || raw.primary_color === "") {
      out.primary_color = null;
    } else if (
      typeof raw.primary_color === "string" &&
      COLOR_RE.test(raw.primary_color.trim())
    ) {
      out.primary_color = raw.primary_color.trim();
    } else {
      throw new Error("site.theme_settings_invalid");
    }
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

  if (raw.page_nav !== undefined) {
    if (
      typeof raw.page_nav === "string" &&
      (THEME_PAGE_NAV_POSITIONS as readonly string[]).includes(raw.page_nav)
    ) {
      out.page_nav = raw.page_nav as ThemePageNav;
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

/** 合并列字段与 theme_settings JSON，列优先于空 JSON。 */
export function resolveThemeSettings(input: {
  theme_settings: unknown;
  logo_url: string | null;
  primary_color: string | null;
}): ThemeSettings {
  const fromJson = safeThemeSettings(input.theme_settings);
  return {
    logo_url:
      fromJson.logo_url !== undefined ? fromJson.logo_url : input.logo_url,
    primary_color:
      fromJson.primary_color !== undefined
        ? fromJson.primary_color
        : input.primary_color,
    font_family: fromJson.font_family ?? "system",
    page_nav: fromJson.page_nav ?? "left",
    page_width: fromJson.page_width ?? "default",
    section_spacing: fromJson.section_spacing ?? THEME_SECTION_SPACING.default,
  };
}

/** 正文最大宽度 → CSS 长度，两处渲染都注入成 `--site-page-width`。 */
export function themePageWidthCss(width: ThemePageWidth | undefined): string {
  return PAGE_WIDTH_CSS[width ?? "default"];
}

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
