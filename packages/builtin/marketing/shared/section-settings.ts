/**
 * Section setting 的**类型系统**（Theme Editor / SSR / 写入校验共用）。
 *
 * 对齐 Shopify theme editor：setting 是声明式的，编辑器据此自动渲染控件，
 * 渲染端按 id 读值，写入路径按同一份声明校验。此文件只管「一个设置项长什么样、
 * 怎么解析」，section 注册表在 `sections/`（一段一个目录）。
 */

import { translateRegisteredKeyTable } from "@rewindom/shared";

import { isSiteColor } from "./site-color.js";

/**
 * 多语言文案值。
 *
 * 存储层保留整张表，渲染层用 `localizeSettingValues` 压成当前语言的字符串——
 * 所以除编辑器外的所有调用方看到的 `settings[id]` 仍然是普通 string。
 *
 * 与页面的分语言存储（`MarketingPage` 一语言一行）分工不同：页面是**整篇各写各的**，
 * 页头 / 页脚这种全站共用、结构必须一致的区域则是**逐字段**翻译（同 Shopify）。
 */
export interface LocalizedText {
  /** locale → 文案；缺的语言在渲染期回落站点默认语言。 */
  __i18n: Record<string, string>;
}

/**
 * 导航条目数组（`type: "nav_items"`）也进 settings。
 *
 * 元素形状由 `site-nav.ts` 的 `safeNavItems` 清洗；这里用 `readonly unknown[]`
 * 避免 section-settings ↔ site-nav 循环依赖。
 */
export type SettingValue =
  | string
  | number
  | boolean
  | LocalizedText
  | readonly unknown[];
export type SettingValues = Record<string, SettingValue>;

export function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as LocalizedText).__i18n === "object" &&
    (value as LocalizedText).__i18n !== null &&
    !Array.isArray((value as LocalizedText).__i18n)
  );
}

/** 只保留字符串项，顺带丢掉脏数据。 */
function cleanLocalizedText(raw: Record<string, unknown>): LocalizedText {
  const out: Record<string, string> = {};
  for (const [locale, text] of Object.entries(raw)) {
    if (typeof text === "string") out[locale] = text;
  }
  return { __i18n: out };
}

/**
 * 取某语言的文案：当前语言 → 站点默认语言 → 表里任意非空项。
 *
 * 最后那档回落是有意的：租户只填了一种语言时，其它语言页面应该显示那份原文，
 * 而不是留白（同 Shopify 未翻译即回落主语言）。
 */
export function resolveLocalizedText(
  value: LocalizedText,
  locale: string,
  fallbackLocale: string,
): string {
  const table = value.__i18n;
  const current = table[locale];
  if (typeof current === "string" && current !== "") return current;
  const fallback = table[fallbackLocale];
  if (typeof fallback === "string" && fallback !== "") return fallback;
  for (const text of Object.values(table)) {
    if (text !== "") return text;
  }
  return "";
}

/**
 * 编辑器读某一语言的原文（**不回落**——回落会让人以为已经翻译过了）。
 *
 * 存量的纯字符串值视为「站点默认语言的原文」，所以只在编辑默认语言时才显示。
 */
export function readLocalizedSetting(
  value: SettingValue | undefined,
  locale: string,
  defaultLocale: string,
): string {
  if (isLocalizedText(value)) return value.__i18n[locale] ?? "";
  if (typeof value === "string") return locale === defaultLocale ? value : "";
  return "";
}

/**
 * 编辑器写某一语言的原文。
 *
 * 只有一种语言的站点保持**纯字符串**存储不变——不主动把所有字段升级成
 * `__i18n`，单语言站点的数据形状因此和以前逐字节一致。真的填了第二种语言时
 * 才升级，并把原来的字符串归到默认语言名下。
 */
export function writeLocalizedSetting(
  current: SettingValue | undefined,
  locale: string,
  defaultLocale: string,
  next: string,
): SettingValue {
  if (isLocalizedText(current)) {
    return { __i18n: { ...current.__i18n, [locale]: next } };
  }
  const existing = typeof current === "string" ? current : "";
  if (locale === defaultLocale) return next;
  return { __i18n: { [defaultLocale]: existing, [locale]: next } };
}

/** 把一组设置值压成当前语言（渲染路径专用）。 */
export function localizeSettingValues(
  values: SettingValues,
  locale: string,
  fallbackLocale: string,
): SettingValues {
  let out: SettingValues | null = null;
  for (const [id, value] of Object.entries(values)) {
    if (!isLocalizedText(value)) continue;
    out ??= { ...values };
    out[id] = resolveLocalizedText(value, locale, fallbackLocale);
  }
  return out ?? values;
}

/**
 * 站点级文案（站名等）：纯字符串或 `__i18n`。
 *
 * 公开面 / 预览压成当前语言；管理端保留整张表给编辑器。
 */
export function localizeSiteText(
  value: unknown,
  locale: string,
  fallbackLocale: string,
): string {
  if (isLocalizedText(value)) {
    return resolveLocalizedText(value, locale, fallbackLocale);
  }
  if (typeof value === "string") return value;
  return "";
}

/**
 * 读路径：把库里的站名收成合法存储形状（脏对象不炸整站）。
 */
export function parseSiteNameValue(value: unknown): string | LocalizedText {
  if (typeof value === "string") return value;
  if (isLocalizedText(value)) return cleanLocalizedText(value.__i18n);
  return "";
}

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

/**
 * 文案类设置项共有的开关：是否可逐语言填写。
 *
 * 默认**可以**——文案类字段绝大多数都是给人读的。少数存的是技术标识
 * （锚点 id、代码片段），显式关掉。
 */
interface LocalizableSetting {
  localizable?: false;
}

/**
 * 文案类设置的内置默认值：字面量，或 `ns:key`。
 *
 * key 在新建段 / 块时从已登记的 locale catalog 展开成 `__i18n` 表，公开面再按
 * 当前语言压扁——这样中文站不会把英文 "Cart" 当主语言原文。存量若仍是表里某一
 * 语的原句或漏进库的 key 本身，解析时升回整张表（租户没改过）；自定义过的句子
 * 保持原样。
 */
function cloneLocalizedTable(table: Record<string, string>): LocalizedText {
  return { __i18n: { ...table } };
}

function localizedTableFromKey(raw: string): LocalizedText | undefined {
  const table = translateRegisteredKeyTable(raw);
  return table ? cloneLocalizedTable(table) : undefined;
}

function resolveTextDefault(
  def: Extract<
    InputSettingDef,
    { type: "text" | "textarea" | "richtext" | "list" }
  >,
): string | LocalizedText {
  const fallback = def.default ?? "";
  return localizedTableFromKey(fallback) ?? fallback;
}

/** 有值的设置项（落到 `settings[id]`）。 */
export type InputSettingDef =
  | (SettingBase &
      LocalizableSetting & {
        type: "text";
        default?: string;
        placeholder?: string;
        required?: boolean;
      })
  | (SettingBase &
      LocalizableSetting & {
        type: "textarea";
        default?: string;
        rows?: number;
        placeholder?: string;
      })
  | (SettingBase &
      LocalizableSetting & {
        type: "richtext";
        default?: string;
        rows?: number;
        placeholder?: string;
      })
  | (SettingBase &
      LocalizableSetting & {
        /** 每行一条的纯文本列表（要点、清单）。 */
        type: "list";
        default?: string;
        rows?: number;
        placeholder?: string;
      })
  | (SettingBase & {
      /**
       * 一个 href 字符串：站内地址从下拉里选（页面 / 文档索引 / 每一篇文档），外链手填。
       *
       * 曾经还有一个只能手打的 `url` 类型，两者存的东西**完全一样**，差别只是编辑器
       * 给不给下拉。于是同一个站点里，页头的自定义链接能从站内选、页头右上角的主
       * CTA 却要手打 `/pricing`——纯属历史遗留，已经删掉，全部走这一个类型。
       *
       * 刻意不存 `{type:"page",id:"..."}` 这类结构化引用：那样每个渲染端都要先解引用
       * 才能画出一个 `<a>`，且页面删掉后引用会悬空。存字符串的代价是改 slug 后链接
       * 会断——但站内重定向本来就是为这件事准备的（见 `MarketingRedirect`）。
       */
      type: "link";
      default?: string;
      placeholder?: string;
    })
  | (SettingBase & {
      /**
       * 导航条目列表，直接嵌在本段 / 本块的 settings 里（见 `site-nav.ts`）。
       *
       * 不是「引用一份外部菜单」——页头与页脚列各自持有自己的 items；要共用就复制。
       */
      type: "nav_items";
      default?: readonly unknown[];
      /**
       * 页脚列：编辑器显示「从页头复制」。页头 / 页脚共用 `chrome_nav` 时，
       * 渲染端还要再挡掉页头自己（复制自己没有意义）。
       */
      copy_from_header?: boolean;
    })
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
  | (SettingBase & {
      type: "color";
      default: string;
      allow_empty?: boolean;
      /**
       * 允许 `#RGBA` / `#RRGGBBAA`。背景 / 前景 / 边框需要半透明时打开；
       * 品牌主色等保持不透明（默认）。
       */
      allow_alpha?: boolean;
    })
  | (SettingBase & {
      /**
       * 容器段的列宽，存成 12 栏制的分配（`"3:7:2"`）。
       *
       * 没有 `options`：候选由**当前有几列**决定，而列是 block，租户随时增删——编译期
       * 枚举不出来。编辑器画成一条多滑块（每个滑块是一处分栏点），所以「加起来不是
       * 一整行」这种坏版式在控件层面就不可能配出来，不必再靠一份预设清单去堵。
       */
      type: "column_spans";
      default?: string;
    })
  | (SettingBase & {
      /**
       * 盒模型留白：展开为 `padding_*`（内四边）+ `spacing_above/below`（外上下）。
       * `id` 只作编辑器 key，不落 `settings[id]`。
       */
      type: "spacing_box";
      padding?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
      };
      spacing?: {
        above?: number;
        below?: number;
      };
    });

/** 纯排版项：只在编辑器里分组，不落数据。 */
export type SettingScope = "content" | "layout" | "appearance";

export type LayoutSettingDef =
  | {
      type: "header";
      content: string;
      /** 该抬头之后的设置项归到哪个页签，缺省算内容。 */
      group?: SettingScope;
    }
  | { type: "paragraph"; content: string };

export type SettingDef = InputSettingDef | LayoutSettingDef;

export function isInputSetting(def: SettingDef): def is InputSettingDef {
  return def.type !== "header" && def.type !== "paragraph";
}

/** 该设置项能否逐语言填写（编辑器据此渲染多语言输入）。 */
export function isLocalizableSetting(def: InputSettingDef): boolean {
  switch (def.type) {
    case "text":
    case "textarea":
    case "richtext":
    case "list":
      return def.localizable !== false;
    default:
      return false;
  }
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

/** 段内留白 range（与编辑器盒模型、旧独立滑块同一口径）。 */
export const SECTION_PADDING_RANGE = {
  min: 0,
  max: 120,
  step: 4,
} as const;

/** 段外间距 range；负哨兵 = 继承主题「区块间距」。 */
export const SECTION_SPACING_RANGE = {
  min: -4,
  max: 96,
  step: 4,
} as const;

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
    case "spacing_box":
      // 复合控件不落单一值；调用方应走 parseSettingValues
      return "";
    case "nav_items":
      return def.default ?? [];
    case "text":
    case "textarea":
    case "richtext":
    case "list":
      return resolveTextDefault(def);
    default:
      return def.default ?? "";
  }
}

export interface SettingRange {
  min: number;
  max: number;
  step: number;
}

/** 夹到 range 内并吸附到最近的档位——编辑器与写入端共用同一套口径。 */
export function snapSettingNumber(value: number, range: SettingRange): number {
  const clamped = Math.min(range.max, Math.max(range.min, value));
  const snapped =
    range.min + Math.round((clamped - range.min) / range.step) * range.step;
  return Number(snapped.toFixed(4));
}

function coerceRangeNumber(
  raw: unknown,
  min: number,
  max: number,
  step: number,
  fallback: number,
): number {
  const num =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw)
        : Number.NaN;
  if (!Number.isFinite(num)) return fallback;
  return snapSettingNumber(num, { min, max, step });
}

function reconcileStockLocalizedText(
  def: Extract<
    InputSettingDef,
    { type: "text" | "textarea" | "richtext" | "list" }
  >,
  value: LocalizedText,
): LocalizedText {
  if (typeof def.default !== "string") return value;
  const stock = translateRegisteredKeyTable(def.default);
  if (!stock) return value;
  const stockValues = new Set(Object.values(stock));
  const out = { ...value.__i18n };
  let changed = false;
  for (const [locale, expected] of Object.entries(stock)) {
    const current = out[locale] ?? "";
    if (current === expected) continue;
    // 空槽、或写进了另一语的库存原句：按当前语言回填。租户自定义过的句子不动。
    if (current === "" || (stockValues.has(current) && current !== expected)) {
      out[locale] = expected;
      changed = true;
    }
  }
  return changed ? { __i18n: out } : value;
}

/** 类型不符一律回落默认值——渲染端与编辑器都不该因脏数据崩掉。 */
function coerceSetting(def: InputSettingDef, raw: unknown): SettingValue {
  switch (def.type) {
    case "text":
    case "textarea":
    case "richtext":
    case "list": {
      if (typeof raw === "string") {
        if (isLocalizableSetting(def)) {
          // 库存还是内置某一语的原句、空字符串、或漏进库的 ns:key：升回整张表
          if (typeof def.default === "string") {
            const table = translateRegisteredKeyTable(def.default);
            if (
              table &&
              (raw === "" ||
                raw === def.default ||
                Object.values(table).includes(raw))
            ) {
              return cloneLocalizedTable(table);
            }
          }
          const fromRaw = translateRegisteredKeyTable(raw);
          if (fromRaw) return cloneLocalizedTable(fromRaw);
        }
        return raw;
      }
      // 多语言表：只有声明了可本地化的字段才认，否则按脏数据回落
      if (isLocalizableSetting(def) && isLocalizedText(raw)) {
        return reconcileStockLocalizedText(
          def,
          cleanLocalizedText(raw.__i18n),
        );
      }
      return resolveTextDefault(def);
    }
    case "link":
    case "image":
    case "column_spans":
      return typeof raw === "string" ? raw.trim() : (def.default ?? "");
    case "nav_items":
      // 结构清洗留给 `safeNavItems`；这里只保证是数组，避免循环依赖。
      // 默认值必须拷贝——否则多处 createSection 会共享同一份引用被就地改脏。
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(def.default)) {
        return JSON.parse(JSON.stringify(def.default)) as unknown[];
      }
      return [];
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
      return coerceRangeNumber(raw, def.min, def.max, def.step, def.default);
    }
    case "checkbox":
      if (typeof raw === "boolean") return raw;
      if (raw === "true") return true;
      if (raw === "false") return false;
      return def.default;
    case "color": {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (!value) return def.allow_empty ? "" : def.default;
      return isSiteColor(value, def.allow_alpha === true) ? value : def.default;
    }
    case "spacing_box":
      return "";
  }
}

/** 把 `spacing_box` 展开成六个独立键（写入 / 渲染共用）。 */
function applySpacingBox(
  def: Extract<InputSettingDef, { type: "spacing_box" }>,
  raw: Record<string, unknown>,
  out: SettingValues,
): void {
  const { min: pMin, max: pMax, step: pStep } = SECTION_PADDING_RANGE;
  const { min: sMin, max: sMax, step: sStep } = SECTION_SPACING_RANGE;
  out.padding_top = coerceRangeNumber(
    raw.padding_top,
    pMin,
    pMax,
    pStep,
    def.padding?.top ?? 0,
  );
  out.padding_right = coerceRangeNumber(
    raw.padding_right,
    pMin,
    pMax,
    pStep,
    def.padding?.right ?? 0,
  );
  out.padding_bottom = coerceRangeNumber(
    raw.padding_bottom,
    pMin,
    pMax,
    pStep,
    def.padding?.bottom ?? 0,
  );
  out.padding_left = coerceRangeNumber(
    raw.padding_left,
    pMin,
    pMax,
    pStep,
    def.padding?.left ?? 0,
  );
  out.spacing_above = coerceRangeNumber(
    raw.spacing_above,
    sMin,
    sMax,
    sStep,
    def.spacing?.above ?? -4,
  );
  out.spacing_below = coerceRangeNumber(
    raw.spacing_below,
    sMin,
    sMax,
    sStep,
    def.spacing?.below ?? -4,
  );
}

/**
 * `background` 内部 token：有 `bg_color` 时丢弃；`muted`/`accent` 透传
 * （表单不声明该字段，不透传则保存会丢淡底）。
 */
function applyBackgroundToken(
  raw: Record<string, unknown>,
  out: SettingValues,
): void {
  const bgColor =
    typeof out.bg_color === "string" ? out.bg_color.trim() : "";
  if (bgColor) return;

  const background =
    typeof raw.background === "string" ? raw.background : "";
  if (background === "muted" || background === "accent") {
    out.background = background;
  }
}

function isBlankSetting(value: SettingValue): boolean {
  if (isLocalizedText(value)) {
    return Object.values(value.__i18n).every((text) => text.trim() === "");
  }
  return String(value).trim() === "";
}

export function parseSettingValues(
  defs: SettingDef[],
  value: unknown,
): SettingValues {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const out: SettingValues = {};
  for (const def of defs) {
    if (!isInputSetting(def)) continue;
    if (def.type === "spacing_box") {
      applySpacingBox(def, raw, out);
      continue;
    }
    const next = coerceSetting(def, raw[def.id]);
    // 必填只要求「有一种语言填了」——逐语言强制会让加一门新语言变成批量报错
    if (def.type === "text" && def.required && isBlankSetting(next)) {
      throw new Error("site.sections_invalid");
    }
    out[def.id] = next;
  }
  applyBackgroundToken(raw, out);
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
