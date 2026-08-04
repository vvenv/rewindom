/**
 * Section 的解析 / 构造层（Theme Editor / SSR / 写入校验共用）。
 *
 * 类型系统在 `section-settings.ts`，注册表在 `section-registry.ts`；
 * 此文件把两者接起来：按 schema 解析脏数据、按 schema 造默认值。
 * 对外统一从这里 re-export，调用方只 import 一个模块。
 */

import {
  getBlockDefinition,
  isContainerSection,
  isPageSectionType,
  resolveGroupSpans,
  SECTION_DEFINITIONS,
  type AreaSectionType,
  type PageSectionType,
  type SectionDefinition,
  type SectionType,
  type SiteBlock,
  type SiteSection,
} from "./section-registry.js";
import {
  isInputSetting,
  isLocalizableSetting,
  isLocalizedText,
  localizeSettingValues,
  parseSettingValues,
  resolveLocalizedText,
  settingBool,
  settingNumber,
  settingText,
  writeLocalizedSetting,
  type SettingDef,
  type SettingValues,
} from "./section-settings.js";
import { normalizeSiteColor } from "./site-color.js";
import { localizeSiteHref } from "./site-locale.js";

import type { AppLocale } from "@be-water/shared";

export * from "./section-settings.js";
export * from "./section-registry.js";

/** 旧业务语义 type → 布局原语（读/写兼容）。 */
const LEGACY_SECTION_TYPE_MAP: Record<string, PageSectionType> = {
  features: "feature-grid",
  cta: "band",
  richtext: "prose",
  markdown: "prose",
};

export function createSectionId(): string {
  return crypto.randomUUID();
}

export function createBlock(
  sectionType: SectionType,
  blockType: string,
  settings?: SettingValues,
): SiteBlock {
  const def = getBlockDefinition(sectionType, blockType);
  if (!def) {
    throw new Error("site.sections_invalid");
  }
  return {
    id: createSectionId(),
    type: blockType,
    settings: parseSettingValues(def.settings, settings ?? {}),
    // 容器 block（`group` 的列）恒带 sections，哪怕是空的——渲染与编辑器都按数组读
    ...(def.container ? { sections: [] } : {}),
  };
}

export function createSection(type: SectionType): SiteSection {
  const def = SECTION_DEFINITIONS[type];
  return {
    id: createSectionId(),
    type,
    settings: parseSettingValues(def.settings, {}),
    blocks: (def.preset_blocks ?? []).map((preset) =>
      createBlock(type, preset.type, preset.settings),
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* 解析                                                                        */
/* -------------------------------------------------------------------------- */

/** 旧 `settings.items[]` → blocks（cards / features 的历史结构）。 */
function legacyItems(raw: Record<string, unknown>): unknown[] | null {
  return Array.isArray(raw.items) ? raw.items : null;
}

/**
 * 解析选项：
 * - `depth`：当前嵌套层数，`0` 是页面直挂的段。容器段只允许出现在 `0` 层。
 * - `strict`：写路径（`parseSections`）为真，坏数据抛错；读路径（`safeSections`）为假，
 *   坏的子段逐个跳过——一列里有一段脏数据不该把整个容器段连坐掉。
 */
interface ParseOptions {
  depth: number;
  strict: boolean;
}

/** 容器 block 里的子段：同一套解析，深度 +1。 */
function parseChildSections(
  value: unknown,
  options: ParseOptions,
): SiteSection[] {
  if (!Array.isArray(value)) return [];
  const child: ParseOptions = {
    depth: options.depth + 1,
    strict: options.strict,
  };
  const out: SiteSection[] = [];
  value.forEach((item, index) => {
    try {
      out.push(parsePageSection(item, index, child));
    } catch (error) {
      if (options.strict) throw error;
      /* skip broken child section */
    }
  });
  return out;
}

function parseBlocks(
  def: SectionDefinition,
  rawBlocks: unknown,
  legacy: unknown[] | null,
  options: ParseOptions,
): SiteBlock[] {
  if (!def.blocks || def.blocks.length === 0) return [];
  const defaultBlockType = def.blocks[0]?.type ?? "";

  const source: unknown[] = Array.isArray(rawBlocks)
    ? rawBlocks
    : (legacy ?? []).map((item) => ({
        type: defaultBlockType,
        settings: item,
      }));

  const blocks: SiteBlock[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const type = typeof row.type === "string" ? row.type : defaultBlockType;
    const blockDef = getBlockDefinition(def.type, type);
    // 未知 block type 直接丢弃：schema 是唯一真相源。
    if (!blockDef) continue;
    blocks.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : createSectionId(),
      type,
      settings: parseSettingValues(blockDef.settings, row.settings),
      ...(blockDef.container
        ? { sections: parseChildSections(row.sections, options) }
        : {}),
    });
  }

  return def.max_blocks ? blocks.slice(0, def.max_blocks) : blocks;
}

function resolvePageSectionType(rawType: unknown): PageSectionType | null {
  if (typeof rawType !== "string") return null;
  if (isPageSectionType(rawType)) return rawType;
  return LEGACY_SECTION_TYPE_MAP[rawType] ?? null;
}

function rawSettingsOf(row: Record<string, unknown>): Record<string, unknown> {
  return row.settings &&
    typeof row.settings === "object" &&
    !Array.isArray(row.settings)
    ? (row.settings as Record<string, unknown>)
    : {};
}

function buildSection(
  type: SectionType,
  row: Record<string, unknown>,
  fallbackId: string,
  options: ParseOptions,
): SiteSection {
  const def = SECTION_DEFINITIONS[type];
  const settings = rawSettingsOf(row);
  return {
    id:
      typeof row.id === "string" && row.id.trim() ? row.id.trim() : fallbackId,
    type,
    settings: parseSettingValues(def.settings, settings),
    blocks: parseBlocks(def, row.blocks, legacyItems(settings), options),
  };
}

function parsePageSection(
  item: unknown,
  index: number,
  options: ParseOptions = { depth: 0, strict: true },
): SiteSection {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("site.sections_invalid");
  }
  const row = item as Record<string, unknown>;
  const type = resolvePageSectionType(row.type);
  if (!type) {
    throw new Error("site.sections_invalid");
  }
  // 深度上限 1：容器段不能装容器段。这道闸门让它保持「布局原语」，
  // 而不是滑成一棵可以无限套下去的自由画布（编辑器的加段菜单里也挡了一道）。
  if (options.depth > 0 && isContainerSection(type)) {
    throw new Error("site.sections_invalid");
  }
  return buildSection(
    type,
    row,
    `section-${index}-${createSectionId()}`,
    options,
  );
}

/** 写路径严格校验；失败抛 Error（code 字符串）由 service 转 ValidationError。 */
export function parseSections(value: unknown): SiteSection[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("site.sections_invalid");
  }
  return value.map((item, index) =>
    parsePageSection(item, index, { depth: 0, strict: true }),
  );
}

/** 读库容错：逐个跳过损坏 section，不因一条脏数据丢掉整页。 */
export function safeSections(value: unknown): SiteSection[] {
  if (!Array.isArray(value)) return [];
  const out: SiteSection[] = [];
  value.forEach((item, index) => {
    try {
      out.push(parsePageSection(item, index, { depth: 0, strict: false }));
    } catch {
      /* skip broken section */
    }
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/* 多语言压平                                                                  */
/* -------------------------------------------------------------------------- */

/** 站内链接按语言改写（`url` 类型的设置项）。 */
function localizeUrlSettings(
  defs: SettingDef[],
  values: SettingValues,
  locale: AppLocale,
  defaultLocale: AppLocale,
): SettingValues {
  let out: SettingValues | null = null;
  for (const def of defs) {
    if (!isInputSetting(def) || def.type !== "url") continue;
    const value = values[def.id];
    if (typeof value !== "string" || value === "") continue;
    const next = localizeSiteHref(value, locale, defaultLocale);
    if (next === value) continue;
    out ??= { ...values };
    out[def.id] = next;
  }
  return out ?? values;
}

/**
 * 把 section（含 blocks）投影到某一种语言：多语言文案压成字符串 + 站内链接补 locale 前缀。
 *
 * 边界只有一处：**公开 / 预览的读路径**。压过之后 `settings[id]` 恒为标量、href 已带前缀，
 * 两处渲染（`client/components/sections/`、`server/ssr-sections.ts`）与所有
 * `settingText` 调用方都不必知道多语言的存在。管理端读路径不压——编辑器要拿整张表和原始 href。
 *
 * `defaultLocale` 同时是文案回落语言与「不带前缀的那种语言」，两者本来就是同一个值。
 */
export function localizeSection(
  section: SiteSection,
  locale: AppLocale,
  defaultLocale: AppLocale,
): SiteSection {
  const def = SECTION_DEFINITIONS[section.type];
  const localize = (defs: SettingDef[], values: SettingValues): SettingValues =>
    localizeUrlSettings(
      defs,
      localizeSettingValues(values, locale, defaultLocale),
      locale,
      defaultLocale,
    );

  return {
    ...section,
    settings: localize(def.settings, section.settings),
    blocks: section.blocks.map((block) => {
      const blockDef = getBlockDefinition(section.type, block.type);
      return {
        ...block,
        settings: localize(blockDef?.settings ?? [], block.settings),
        // 容器 block 的子段一起压：漏了的话列里的文案在公开页会整片空白
        ...(block.sections
          ? {
              sections: block.sections.map((child) =>
                localizeSection(child, locale, defaultLocale),
              ),
            }
          : {}),
      };
    }),
  };
}

export function localizeSections(
  sections: SiteSection[],
  locale: AppLocale,
  defaultLocale: AppLocale,
): SiteSection[] {
  return sections.map((section) =>
    localizeSection(section, locale, defaultLocale),
  );
}

/* -------------------------------------------------------------------------- */
/* 多语言搬运（复制页面到另一种语言）                                          */
/* -------------------------------------------------------------------------- */

/** 把一组设置值里的文案，从 `from` 语言的槽位复制到 `to` 语言的槽位。 */
function relocalizeValues(
  defs: SettingDef[],
  values: SettingValues,
  from: AppLocale,
  to: AppLocale,
  defaultLocale: AppLocale,
): SettingValues {
  let out: SettingValues | null = null;
  for (const def of defs) {
    if (!isInputSetting(def) || !isLocalizableSetting(def)) continue;
    const current = values[def.id];
    const text = isLocalizedText(current)
      ? resolveLocalizedText(current, from, defaultLocale)
      : typeof current === "string"
        ? current
        : "";
    out ??= { ...values };
    out[def.id] = writeLocalizedSetting(current, to, defaultLocale, text);
  }
  return out ?? values;
}

/**
 * 复制页面到另一种语言时的文案搬运：**把源语言的原文填进目标语言的槽位**。
 *
 * 不搬的话新页面在编辑器里会是一片空白——`readLocalizedSetting` 刻意不回落
 * （回落会让人以为已经翻译过了），而复制的用途恰恰是「拿原文当翻译起点」。
 * 源语言的槽位原样保留，所以复制不会把原文弄丢。
 */
export function relocalizeSection(
  section: SiteSection,
  from: AppLocale,
  to: AppLocale,
  defaultLocale: AppLocale,
): SiteSection {
  if (from === to) return section;
  const def = SECTION_DEFINITIONS[section.type];
  return {
    ...section,
    settings: relocalizeValues(
      def.settings,
      section.settings,
      from,
      to,
      defaultLocale,
    ),
    blocks: section.blocks.map((block) => ({
      ...block,
      settings: relocalizeValues(
        getBlockDefinition(section.type, block.type)?.settings ?? [],
        block.settings,
        from,
        to,
        defaultLocale,
      ),
      ...(block.sections
        ? {
            sections: block.sections.map((child) =>
              relocalizeSection(child, from, to, defaultLocale),
            ),
          }
        : {}),
    })),
  };
}

export function relocalizeSections(
  sections: SiteSection[],
  from: AppLocale,
  to: AppLocale,
  defaultLocale: AppLocale,
): SiteSection[] {
  if (from === to) return sections;
  return sections.map((section) =>
    relocalizeSection(section, from, to, defaultLocale),
  );
}

/* -------------------------------------------------------------------------- */
/* 站点级区域（页头 / 页脚）                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 页头 / 页脚区：各是**一串** section。
 *
 * 区域里必有一段本体（`header` / `footer` 那个导航条本身），其余按 `placements`
 * 放行——通栏 CTA 当公告条、prose 放备案号都走这条路，不为每种花样另造类型。
 * 本体缺了就补一个：没有导航条的页头是坏数据，不是一种配置。
 */
export function parseAreaSections(
  area: AreaSectionType,
  value: unknown,
): SiteSection[] {
  const rows = Array.isArray(value) ? value : [];
  const sections: SiteSection[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const raw = row as Record<string, unknown>;
    const type = typeof raw.type === "string" ? raw.type : "";
    const def = Object.hasOwn(SECTION_DEFINITIONS, type)
      ? SECTION_DEFINITIONS[type as SectionType]
      : undefined;
    if (!def?.placements.includes(area)) {
      throw new Error("site.sections_invalid");
    }
    sections.push(
      buildSection(def.type, raw, createSectionId(), {
        depth: 0,
        strict: true,
      }),
    );
  }
  return ensureAreaBody(area, sections);
}

/** 区域本体（导航条 / 页脚本体）只能有一段，且必须在：缺了补、多了删。 */
function ensureAreaBody(
  area: AreaSectionType,
  sections: SiteSection[],
): SiteSection[] {
  const body = sections.filter((section) => section.type === area);
  const rest = sections.filter((section) => section.type !== area);
  if (body.length === 1) return sections;
  const kept = body[0] ?? createSection(area);
  // 页头本体排最后（公告条在导航条上方是通例），页脚本体排最前
  return area === "header" ? [...rest, kept] : [kept, ...rest];
}

export function safeAreaSections(
  area: AreaSectionType,
  value: unknown,
): SiteSection[] {
  try {
    return parseAreaSections(area, value);
  } catch {
    return [createSection(area)];
  }
}

/* -------------------------------------------------------------------------- */
/* 迁移与回落                                                                  */
/* -------------------------------------------------------------------------- */

/** 旧 home_blocks → sections（迁移 / 兼容）。 */
export function homeBlocksToSections(home_blocks: unknown): SiteSection[] {
  if (
    !home_blocks ||
    typeof home_blocks !== "object" ||
    Array.isArray(home_blocks)
  ) {
    return [];
  }
  const raw = home_blocks as Record<string, unknown>;
  const sections: SiteSection[] = [];

  if (raw.hero && typeof raw.hero === "object" && !Array.isArray(raw.hero)) {
    try {
      sections.push(parsePageSection({ type: "hero", settings: raw.hero }, 0));
    } catch {
      /* skip invalid hero */
    }
  }

  if (Array.isArray(raw.features) && raw.features.length > 0) {
    try {
      sections.push(
        parsePageSection(
          { type: "features", settings: { items: raw.features } },
          1,
        ),
      );
    } catch {
      /* skip invalid features */
    }
  }

  return sections;
}


export interface SectionLayout {
  /** 色块（背景 / 分隔线）铺到哪：`page` 居中限宽，`full` 通栏。 */
  width: "page" | "full";
  /** 正文铺到哪：`default` 跟随页宽，`narrow` 收窄一档，`full` 不限宽。 */
  contentWidth: "default" | "narrow" | "full";
  /** 色块**内**的上下留白（底色包住的那部分）。 */
  paddingTop: number;
  paddingBottom: number;
  /** 与上/下一段之间想要的间距；`null` 表示继承主题的「区块间距」。 */
  spacingAbove: number | null;
  spacingBelow: number | null;
  background: "none" | "muted" | "accent" | "outline";
  dividerTop: boolean;
  dividerBottom: boolean;
  /** 已归一化的锚点 id（可为空），供页内导航链接 `#anchor`。 */
  anchor: string;
}

const BACKGROUNDS = new Set(["none", "muted", "accent", "outline"]);
const WIDTHS = new Set(["page", "full"]);
const CONTENT_WIDTHS = new Set(["default", "narrow", "full"]);

/** 锚点直接进 HTML `id`，收敛成 slug 而不是原样透传。 */
function resolveAnchor(settings: SettingValues): string {
  return settingText(settings, "anchor")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9一-龥-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 64);
}

/** 段间距的哨兵：负值 = 不覆盖，跟随主题的「区块间距」。 */
function resolveSpacing(settings: SettingValues, id: string): number | null {
  const value = settingNumber(settings, id, -4);
  return value < 0 ? null : value;
}

/**
 * 所有页面 section 共有的版式设置，解析成两处渲染都能直接用的形状。
 *
 * 段内留白（padding）落在色块上、段间距（spacing）落在段与段之间，两者互不相扰——
 * 这是 Shopify 的分工：padding 归 section 自己，段间距归主题统一，需要时逐段覆盖。
 */
export function resolveSectionLayout(settings: SettingValues): SectionLayout {
  const background = settingText(settings, "background");
  const divider = settingText(settings, "divider");
  const width = settingText(settings, "width");
  const contentWidth = settingText(settings, "content_width");
  return {
    width: WIDTHS.has(width) ? (width as SectionLayout["width"]) : "page",
    contentWidth: CONTENT_WIDTHS.has(contentWidth)
      ? (contentWidth as SectionLayout["contentWidth"])
      : "default",
    paddingTop: settingNumber(settings, "padding_top", 32),
    paddingBottom: settingNumber(settings, "padding_bottom", 32),
    spacingAbove: resolveSpacing(settings, "spacing_above"),
    spacingBelow: resolveSpacing(settings, "spacing_below"),
    background: BACKGROUNDS.has(background)
      ? (background as SectionLayout["background"])
      : "none",
    dividerTop: divider === "top" || divider === "both",
    dividerBottom: divider === "bottom" || divider === "both",
    anchor: resolveAnchor(settings),
  };
}

/**
 * 通用外观（背景 / 前景 / 边框 / 圆角），section / chrome / block 共用。
 *
 * 空颜色 = 不覆盖（继续走 token `background` 或主题默认）。圆角负哨兵 = 继承
 * 渲染端默认（色块 `rounded-xl`、通栏 0、卡片同 CARD_SHELL）。
 */
export interface SurfaceStyle {
  backgroundColor: string | null;
  color: string | null;
  borderColor: string | null;
  /** 实际要画的边框宽度；`border_color` 有值而宽度为 0 时按 1px。 */
  borderWidth: number;
  /** `null` = 跟随渲染端默认圆角。 */
  borderRadius: number | null;
}

export function resolveSurfaceStyle(settings: SettingValues): SurfaceStyle {
  const backgroundColor = normalizeSiteColor(settingText(settings, "bg_color"));
  const color = normalizeSiteColor(settingText(settings, "fg_color"));
  const borderColor = normalizeSiteColor(settingText(settings, "border_color"));
  const rawWidth = settingNumber(settings, "border_width", 0);
  const borderWidth =
    rawWidth > 0 ? rawWidth : borderColor !== null ? 1 : 0;
  const radiusRaw = settingNumber(settings, "radius", -4);
  return {
    backgroundColor,
    color,
    borderColor,
    borderWidth,
    borderRadius: radiusRaw < 0 ? null : radiusRaw,
  };
}

/** 是否有任何自定义外观（决定要不要加 has-surface 类 / 跳过 token 底色）。 */
export function hasCustomSurface(style: SurfaceStyle): boolean {
  return (
    style.backgroundColor !== null ||
    style.color !== null ||
    style.borderWidth > 0 ||
    style.borderRadius !== null
  );
}

/**
 * 落到 React `style` / SSR inline 的外观属性。
 *
 * CSS 变量留给需要在子元素继承的场景（如 `--sec-fg`）；直接属性给色块自己用。
 */
export function surfaceStyleCss(
  style: SurfaceStyle,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (style.backgroundColor) {
    out.backgroundColor = style.backgroundColor;
    out["--sec-bg"] = style.backgroundColor;
  }
  if (style.color) {
    out.color = style.color;
    out["--sec-fg"] = style.color;
  }
  if (style.borderWidth > 0) {
    out.borderWidth = style.borderWidth;
    out.borderStyle = "solid";
    out["--sec-bw"] = `${style.borderWidth}px`;
    if (style.borderColor) {
      out.borderColor = style.borderColor;
      out["--sec-bc"] = style.borderColor;
    }
  }
  if (style.borderRadius !== null) {
    out.borderRadius = style.borderRadius;
    out["--sec-radius"] = `${style.borderRadius}px`;
  }
  return out;
}

/** SSR：拼进 `style=""` 的片段（末尾不带分号之外的内容）。 */
export function surfaceStyleAttr(style: SurfaceStyle): string {
  const css = surfaceStyleCss(style);
  const parts: string[] = [];
  for (const [key, value] of Object.entries(css)) {
    if (key.startsWith("--")) {
      parts.push(`${key}:${value}`);
      continue;
    }
    // camelCase → kebab-case
    const prop = key.replace(/[A-Z]/gu, (ch) => `-${ch.toLowerCase()}`);
    parts.push(`${prop}:${typeof value === "number" ? `${value}px` : value}`);
  }
  return parts.join(";");
}

/**
 * 每一段**上方**的间距（首段恒为 0，页头页脚各自贴边）。
 *
 * 显式算出来落到具体的段上，不靠 margin 折叠——折叠的结果依赖包装层有没有
 * padding/border/overflow，哪天有人加一句 `overflow-hidden` 就会静默翻倍。
 *
 * 一条缝由相邻两段共同决定：**显式覆盖压过继承**，两边都显式时取较大的一方。
 * 不能无脑取 max——那样某段设成 0（想和上一段拼成连续色带）会被邻居继承来的
 * 主题值挡住，租户会觉得这个设置失灵了。
 */
export function resolveSectionGaps(
  layouts: SectionLayout[],
  themeSpacing: number,
): number[] {
  return layouts.map((layout, index) => {
    if (index === 0) return 0;
    const below = layouts[index - 1]!.spacingBelow;
    const above = layout.spacingAbove;
    if (below === null && above === null) return themeSpacing;
    if (below === null) return above!;
    if (above === null) return below;
    return Math.max(below, above);
  });
}

/**
 * `page-header` 段最终显示的文案：段上填了就用段上的，留空回落到页面自己的
 * 标题 / 描述。
 *
 * 回落是这一段的关键——新建页面不填任何东西也自带 h1，租户不用把标题抄两遍；
 * 想让展示标题与 SEO 标题不一样时再填。客户端与 SSR 共用这一份，避免两边算出
 * 不同的 h1。
 */
export function resolvePageHeaderText(
  settings: SettingValues,
  page?: { title?: string; description?: string } | null,
): { headline: string; subhead: string } {
  return {
    headline: settingText(settings, "headline").trim() || (page?.title ?? ""),
    subhead:
      settingText(settings, "subhead").trim() || (page?.description ?? ""),
  };
}

/** 容器段的一列：列 block 本身 + 它装的子段 + 已算好的 12 栏宽。 */
export interface GroupColumn {
  block: SiteBlock;
  sections: SiteSection[];
  /** 12 栏制列宽（桌面）。 */
  span: number;
  sticky: boolean;
  /** 窄屏堆叠顺序：`auto` 按声明顺序。 */
  stackOrder: "auto" | "first" | "last";
}

/**
 * 容器段解析（两处渲染 + 编辑器共用）：列表 + 列宽。
 *
 * 空列照样返回——编辑器里刚加出来的列必须能被选中、能往里放东西；
 * 公开渲染那边由 `GroupSection` / `renderGroup` 自己决定要不要跳过空列。
 */
export function groupColumns(section: SiteSection): GroupColumn[] {
  const columns = section.blocks.filter(
    (block) => block.sections !== undefined,
  );
  const spans = resolveGroupSpans(
    settingText(section.settings, "columns_layout") || "1:3",
    columns.length,
  );
  return columns.map((block, index) => {
    const stackOrder = settingText(block.settings, "stack_order");
    return {
      block,
      sections: block.sections ?? [],
      span: spans[index] ?? 12,
      sticky: settingBool(block.settings, "sticky"),
      stackOrder:
        stackOrder === "first" || stackOrder === "last" ? stackOrder : "auto",
    };
  });
}

export function gridColumnsClass(columns: number): string {
  switch (columns) {
    case 2:
      return "sm:grid-cols-2";
    case 4:
      return "sm:grid-cols-2 lg:grid-cols-4";
    default:
      return "sm:grid-cols-2 lg:grid-cols-3";
  }
}
