/**
 * Section 的解析 / 构造层（Theme Editor / SSR / 写入校验共用）。
 *
 * 类型系统在 `section-settings.ts`，注册表在 `section-registry.ts`；
 * 此文件把两者接起来：按 schema 解析脏数据、按 schema 造默认值。
 * 对外统一从这里 re-export，调用方只 import 一个模块。
 */

import {
  getBlockDefinition,
  isPageSectionType,
  SECTION_DEFINITIONS,
  type AreaSectionType,
  type PageSectionType,
  type SectionDefinition,
  type SectionType,
  type SiteBlock,
  type SiteSection,
} from "./section-registry.js";
import {
  parseSettingValues,
  settingNumber,
  settingText,
  type SettingValues,
} from "./section-settings.js";

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

function parseBlocks(
  def: SectionDefinition,
  rawBlocks: unknown,
  legacy: unknown[] | null,
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
): SiteSection {
  const def = SECTION_DEFINITIONS[type];
  const settings = rawSettingsOf(row);
  return {
    id:
      typeof row.id === "string" && row.id.trim() ? row.id.trim() : fallbackId,
    type,
    settings: parseSettingValues(def.settings, settings),
    blocks: parseBlocks(def, row.blocks, legacyItems(settings)),
  };
}

function parsePageSection(item: unknown, index: number): SiteSection {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("site.sections_invalid");
  }
  const row = item as Record<string, unknown>;
  const type = resolvePageSectionType(row.type);
  if (!type) {
    throw new Error("site.sections_invalid");
  }
  return buildSection(type, row, `section-${index}-${createSectionId()}`);
}

/** 写路径严格校验；失败抛 Error（code 字符串）由 service 转 ValidationError。 */
export function parseSections(value: unknown): SiteSection[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("site.sections_invalid");
  }
  return value.map((item, index) => parsePageSection(item, index));
}

/** 读库容错：逐个跳过损坏 section，不因一条脏数据丢掉整页。 */
export function safeSections(value: unknown): SiteSection[] {
  if (!Array.isArray(value)) return [];
  const out: SiteSection[] = [];
  value.forEach((item, index) => {
    try {
      out.push(parsePageSection(item, index));
    } catch {
      /* skip broken section */
    }
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/* 站点级区域（页头 / 页脚）                                                    */
/* -------------------------------------------------------------------------- */

/** 旧结构：`nav_json` / `footer_json` 是 `{label, href}[]`。 */
function legacyLinksToBlocks(
  type: AreaSectionType,
  value: unknown[],
): SiteBlock[] {
  const blockType = type === "header" ? "nav_link" : "footer_link";
  const blocks: SiteBlock[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const href = typeof row.href === "string" ? row.href.trim() : "";
    if (!label || !href) continue;
    try {
      blocks.push(createBlock(type, blockType, { label, href }));
    } catch {
      /* skip invalid legacy link */
    }
  }
  return blocks;
}

/**
 * 页头 / 页脚：每站点各一个 section。
 *
 * 兼容三种存量形态——已是 section 对象、旧的链接数组、以及空值（回落默认）。
 */
export function parseAreaSection(
  type: AreaSectionType,
  value: unknown,
): SiteSection {
  if (Array.isArray(value)) {
    const base = createSection(type);
    return { ...base, blocks: legacyLinksToBlocks(type, value) };
  }
  if (!value || typeof value !== "object") {
    return createSection(type);
  }
  const row = value as Record<string, unknown>;
  // 存的 type 与列语义冲突时以列为准：一个站点只有一个页头 / 页脚。
  if (row.type !== undefined && row.type !== type) {
    throw new Error("site.sections_invalid");
  }
  return buildSection(type, row, createSectionId());
}

export function safeAreaSection(
  type: AreaSectionType,
  value: unknown,
): SiteSection {
  try {
    return parseAreaSection(type, value);
  } catch {
    return createSection(type);
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

/** 渲染用：sections 优先；若为空则用 body_md 回退为 prose section。 */
export function resolvePageSections(input: {
  sections: unknown;
  body_md?: string;
}): SiteSection[] {
  const sections = safeSections(input.sections);
  if (sections.length > 0) return sections;
  const body = input.body_md?.trim() ?? "";
  if (!body) return [];
  return [
    {
      id: "legacy-body-md",
      type: "prose",
      settings: { body_md: input.body_md ?? "", width: "page" },
      blocks: [],
    },
  ];
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
 * 页面是否以 hero 开场（hero 自己就渲染 h1 + 副标题）。
 *
 * 用来决定要不要再渲染「页面标题 + 描述」那块 page-head——hero 已经把标题说了一遍，
 * 再渲染一次就是重复内容 + 两个 h1（关于我们 / 联系我们 预设都会撞上）。
 * 只有 prose 的文档正文页没有自带标题，仍然靠 page-head 提供 h1。
 */
export function sectionsLeadWithHero(sections: SiteSection[]): boolean {
  const first = sections[0];
  if (!first || first.type !== "hero") return false;
  return Boolean(settingText(first.settings, "headline"));
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
