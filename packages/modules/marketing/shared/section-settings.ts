/**
 * Section setting 的**类型系统**（Theme Editor / SSR / 写入校验共用）。
 *
 * 对齐 Shopify theme editor：setting 是声明式的，编辑器据此自动渲染控件，
 * 渲染端按 id 读值，写入路径按同一份声明校验。此文件只管「一个设置项长什么样、
 * 怎么解析」，section 注册表在 `section-registry.ts`。
 */

export type SettingValue = string | number | boolean;
export type SettingValues = Record<string, SettingValue>;

export interface SettingOption {
  value: string;
  /** i18n key（`marketing` namespace 下的相对 key） */
  label: string;
}

interface SettingBase {
  id: string;
  /** i18n key */
  label: string;
  /** i18n key，字段下方的说明文案 */
  info?: string;
}

/** 有值的设置项（落到 `settings[id]`）。 */
export type InputSettingDef =
  | (SettingBase & {
      type: "text";
      default?: string;
      placeholder?: string;
      required?: boolean;
    })
  | (SettingBase & {
      type: "textarea";
      default?: string;
      rows?: number;
      placeholder?: string;
    })
  | (SettingBase & {
      type: "richtext";
      default?: string;
      rows?: number;
      placeholder?: string;
    })
  | (SettingBase & {
      /** 每行一条的纯文本列表（要点、清单）。 */
      type: "list";
      default?: string;
      rows?: number;
      placeholder?: string;
    })
  | (SettingBase & { type: "url"; default?: string; placeholder?: string })
  | (SettingBase & { type: "image"; default?: string; placeholder?: string })
  | (SettingBase & {
      type: "select";
      default: string;
      options: readonly SettingOption[];
    })
  | (SettingBase & {
      /** lucide 图标名，取值受 `SECTION_ICON_CHOICES` 约束。 */
      type: "icon";
      default?: string;
    })
  | (SettingBase & {
      type: "range";
      default: number;
      min: number;
      max: number;
      step: number;
      unit?: string;
      /**
       * 允许「继承」：负值（滑块最左一格）表示不覆盖，跟随主题设置。
       * 用哨兵而不是单独的 select，是为了让所有留白都是同一种控件、同一个单位。
       */
      allow_inherit?: boolean;
    })
  | (SettingBase & { type: "checkbox"; default: boolean })
  | (SettingBase & { type: "color"; default: string; allow_empty?: boolean });

/** 纯排版项：只在编辑器里分组，不落数据。 */
export type LayoutSettingDef =
  | {
      type: "header";
      content: string;
      /** 该抬头之后的设置项归到哪个页签，缺省算内容。 */
      group?: "content" | "layout";
    }
  | { type: "paragraph"; content: string };

export type SettingDef = InputSettingDef | LayoutSettingDef;

export function isInputSetting(def: SettingDef): def is InputSettingDef {
  return def.type !== "header" && def.type !== "paragraph";
}

/**
 * 图标候选：schema 里存 lucide 组件名，渲染端各自映射。
 * 收敛成白名单，避免脏数据把任意字符串当组件名解析。
 */
export const SECTION_ICON_CHOICES = [
  "Sparkles",
  "Bot",
  "Layers",
  "Blocks",
  "Plug",
  "Shield",
  "Server",
  "Rocket",
  "Zap",
  "Globe",
  "Lock",
  "Users",
  "LineChart",
  "Puzzle",
  "Workflow",
  "Boxes",
] as const;

export type SectionIconName = (typeof SECTION_ICON_CHOICES)[number];

const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u;

/** 旧字段名 → 新 setting id。 */
const LEGACY_SETTING_ALIASES: Record<string, string> = {
  cta_label: "primary_label",
  cta_href: "primary_href",
  description: "body",
};

/**
 * 旧的单档 `width` 拆成了「色块宽度 + 正文宽度」两个维度。
 * `narrow` 说的其实一直是正文，色块本身仍是限宽的。
 */
const LEGACY_WIDTH: Record<string, { width: string; content_width?: string }> =
  {
    wide: { width: "page" },
    narrow: { width: "page", content_width: "narrow" },
  };

/** band 旧的 `tone` 与通用 `background` 是同一件事，已合并到后者。 */
const LEGACY_TONE_TO_BACKGROUND: Record<string, string> = {
  plain: "none",
  outline: "outline",
  muted: "muted",
  accent: "accent",
};

export function defaultSettingValue(def: InputSettingDef): SettingValue {
  switch (def.type) {
    case "select":
    case "color":
      return def.default;
    case "range":
    case "checkbox":
      return def.default;
    case "icon":
      return def.default ?? SECTION_ICON_CHOICES[0];
    default:
      return def.default ?? "";
  }
}

/** 类型不符一律回落默认值——渲染端与编辑器都不该因脏数据崩掉。 */
function coerceSetting(def: InputSettingDef, raw: unknown): SettingValue {
  switch (def.type) {
    case "text":
    case "textarea":
    case "richtext":
    case "list":
      return typeof raw === "string" ? raw : (def.default ?? "");
    case "url":
    case "image":
      return typeof raw === "string" ? raw.trim() : (def.default ?? "");
    case "icon": {
      const value = typeof raw === "string" ? raw.trim() : "";
      return (SECTION_ICON_CHOICES as readonly string[]).includes(value)
        ? value
        : defaultSettingValue(def);
    }
    case "select": {
      const value = typeof raw === "string" ? raw : "";
      return def.options.some((option) => option.value === value)
        ? value
        : def.default;
    }
    case "range": {
      const num =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? Number(raw)
            : Number.NaN;
      if (!Number.isFinite(num)) return def.default;
      const clamped = Math.min(def.max, Math.max(def.min, num));
      const snapped =
        def.min + Math.round((clamped - def.min) / def.step) * def.step;
      return Number(snapped.toFixed(4));
    }
    case "checkbox":
      if (typeof raw === "boolean") return raw;
      if (raw === "true") return true;
      if (raw === "false") return false;
      return def.default;
    case "color": {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (!value) return def.allow_empty ? "" : def.default;
      return COLOR_RE.test(value) ? value : def.default;
    }
  }
}

function withLegacyAliases(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  let patched: Record<string, unknown> | null = null;
  const patch = (id: string, value: unknown): void => {
    patched ??= { ...raw };
    patched[id] = value;
  };

  for (const [from, to] of Object.entries(LEGACY_SETTING_ALIASES)) {
    if (raw[from] !== undefined && raw[to] === undefined) {
      patch(to, raw[from]);
    }
  }

  if (typeof raw.width === "string" && raw.width in LEGACY_WIDTH) {
    const migrated = LEGACY_WIDTH[raw.width]!;
    patch("width", migrated.width);
    if (migrated.content_width && raw.content_width === undefined) {
      patch("content_width", migrated.content_width);
    }
  }

  if (raw.background === undefined && typeof raw.tone === "string") {
    const background = LEGACY_TONE_TO_BACKGROUND[raw.tone];
    if (background) patch("background", background);
  }

  // 旧的两个 checkbox → 单个 divider 选择项
  if (raw.divider === undefined) {
    const top = raw.divider_top === true;
    const bottom = raw.divider_bottom === true;
    if (top || bottom) {
      patch("divider", top ? (bottom ? "both" : "top") : "bottom");
    }
  }

  return patched ?? raw;
}

export function parseSettingValues(
  defs: SettingDef[],
  value: unknown,
): SettingValues {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? withLegacyAliases(value as Record<string, unknown>)
      : {};
  const out: SettingValues = {};
  for (const def of defs) {
    if (!isInputSetting(def)) continue;
    const next = coerceSetting(def, raw[def.id]);
    if (def.type === "text" && def.required && String(next).trim() === "") {
      throw new Error("site.sections_invalid");
    }
    out[def.id] = next;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* 取值助手（渲染端用，避免到处写 `as string`）                                */
/* -------------------------------------------------------------------------- */

export function settingText(values: SettingValues, id: string): string {
  const value = values[id];
  return typeof value === "string" ? value : "";
}

export function settingNumber(
  values: SettingValues,
  id: string,
  fallback: number,
): number {
  const value = values[id];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function settingBool(values: SettingValues, id: string): boolean {
  return values[id] === true;
}

/** `list` 类型取值：按行拆分并去掉空行。 */
export function settingLines(values: SettingValues, id: string): string[] {
  return settingText(values, id)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function settingIcon(
  values: SettingValues,
  id: string,
): SectionIconName {
  const value = settingText(values, id);
  return (SECTION_ICON_CHOICES as readonly string[]).includes(value)
    ? (value as SectionIconName)
    : SECTION_ICON_CHOICES[0];
}
