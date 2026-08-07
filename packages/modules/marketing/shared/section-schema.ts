/**
 * Section 的解析 / 构造层（Theme Editor / SSR / 写入校验共用）。
 *
 * 类型系统在 `section-settings.ts`，注册表在 `sections/`（一段一个目录）；
 * 此文件把两者接起来：按 schema 解析脏数据、按 schema 造默认值。
 * 对外统一从这里 re-export，调用方只 import 一个模块。
 */

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
import {
  getBlockDefinition,
  getSectionDefinition,
  isContainerSection,
  isPageSectionType,
  resolveGroupSpans,
  type AreaSectionType,
  type PageSectionType,
  type SectionDefinition,
  type SectionType,
  type SiteBlock,
  type SiteSection,
  type UnsupportedSectionSource,
} from "./sections/index.js";
import { normalizeSiteColor } from "./site-color.js";
import { localizeSiteHref } from "./site-locale.js";

import type { AppLocale } from "@be-water/shared";

export * from "./section-settings.js";
export * from "./sections/index.js";

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
  const def = getSectionDefinition(type);
  // 造一个不认识的段没有意义：调用方要么传了内置 type，要么传了已注册的贡献段
  if (!def) throw new Error("site.sections_invalid");
  const settings = parseSettingValues(def.settings, {});
  // band 默认淡底：表单不再有 background 预设，内部仍写 token 供渲染
  if (
    type === "band" &&
    !settingText(settings, "bg_color") &&
    !settingText(settings, "background")
  ) {
    settings.background = "muted";
  }
  return {
    id: createSectionId(),
    type,
    settings,
    blocks: (def.preset_blocks ?? []).map((preset) =>
      createBlock(type, preset.type, preset.settings),
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* 解析                                                                        */
/* -------------------------------------------------------------------------- */

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
  options: ParseOptions,
): SiteBlock[] {
  if (!def.blocks || def.blocks.length === 0) return [];
  const defaultBlockType = def.blocks[0]?.type ?? "";

  const source: unknown[] = Array.isArray(rawBlocks) ? rawBlocks : [];

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
  return isPageSectionType(rawType) ? rawType : null;
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
  const def = getSectionDefinition(type);
  if (!def) throw new Error("site.sections_invalid");
  const settings = rawSettingsOf(row);
  return {
    id:
      typeof row.id === "string" && row.id.trim() ? row.id.trim() : fallbackId,
    type,
    settings: parseSettingValues(def.settings, settings),
    blocks: parseBlocks(def, row.blocks, options),
  };
}

/* -------------------------------------------------------------------------- */
/* 不认识的段                                                                  */
/* -------------------------------------------------------------------------- */

const UNSUPPORTED_TYPE = "unsupported";

/**
 * 读出 `unsupported` 占位里兜着的原始条目。
 *
 * `source.type` 自己是 `unsupported` 的话当没读到——不接受套娃，否则一次
 * 读-写往返就多一层壳，几次之后原始数据埋在十层里。
 */
function readUnsupportedSource(
  row: Record<string, unknown>,
): UnsupportedSectionSource | null {
  const source = row.source;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }
  const value = source as Record<string, unknown>;
  if (typeof value.type !== "string" || value.type === UNSUPPORTED_TYPE) {
    return null;
  }
  return { type: value.type, raw: value.raw };
}

/**
 * 这份代码认不认识这个 type —— 不论它能不能放在当前位置。
 *
 * 用来分开两种「解析不了」：**不认识**（模块停用，兜住等它回来）与
 * **认识但放错了地方**（把页头段塞进页面段流）。后者是坏数据：`placements` 写死在
 * 代码里，没有任何模块开关能让 `pricing` 变成合法的页头段，兜着它也永远复活不了。
 */
function isKnownSectionType(value: unknown): value is SectionType {
  return typeof value === "string" && getSectionDefinition(value) !== undefined;
}

function buildUnsupportedSection(
  source: UnsupportedSectionSource,
  fallbackId: string,
): SiteSection {
  const raw =
    source.raw && typeof source.raw === "object" && !Array.isArray(source.raw)
      ? (source.raw as Record<string, unknown>)
      : {};
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : fallbackId,
    type: UNSUPPORTED_TYPE,
    settings: {},
    blocks: [],
    source,
  };
}

/**
 * 撞见不认识的段时怎么办 —— 全模块统一口径，改这里就改了所有入口。
 *
 * **读路径原样兜住，写路径拒收。** 两条合起来才成立：
 *
 * - 兜住：模块停用、租户退订、页面是更新版本写的，都会让某个 type 突然不认识。
 *   静默丢掉的话，租户下次一保存就永久没了，重新启用模块也回不来——而这恰恰是
 *   最常见的一次操作（停用模块 → 打开编辑器看看 → 顺手保存）。
 * - 拒收：编辑器手上的未知段一定已经是 `unsupported` 占位（读路径给的），所以写
 *   路径上再冒出一个裸的未知 type，只可能是客户端 bug 或构造的请求，没有放行的理由。
 *
 * 占位段两端都不渲染，公开页与 SSR 一致——不可用不等于露出半个坏掉的段。
 */
function parseUnsupported(
  row: Record<string, unknown>,
  fallbackId: string,
  options: ParseOptions,
): SiteSection {
  const source = readUnsupportedSource(row);
  // 壳都坏了：里面兜的是什么已经无从得知，按坏数据处理
  if (!source) throw new Error("site.sections_invalid");

  // 模块又启用了 / 版本追上了：原样复活，不留痕迹——这是「可恢复」的那一半
  if (source.raw && typeof source.raw === "object" && !Array.isArray(source.raw)) {
    const inner = source.raw as Record<string, unknown>;
    const innerType = resolvePageSectionType(inner.type);
    if (innerType && !(options.depth > 0 && isContainerSection(innerType))) {
      return buildSection(innerType, inner, fallbackId, options);
    }
  }
  return buildUnsupportedSection(source, fallbackId);
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
  const fallbackId = `section-${index}-${createSectionId()}`;

  if (row.type === UNSUPPORTED_TYPE) {
    return parseUnsupported(row, fallbackId, options);
  }

  const type = resolvePageSectionType(row.type);
  if (!type) {
    // 认识但不该出现在页面段流里（`header` / `footer`）：坏数据，丢
    if (options.strict || isKnownSectionType(row.type)) {
      throw new Error("site.sections_invalid");
    }
    return buildUnsupportedSection(
      { type: typeof row.type === "string" ? row.type : "", raw: row },
      fallbackId,
    );
  }
  // 深度上限 1：容器段不能装容器段。这道闸门让它保持「布局原语」，
  // 而不是滑成一棵可以无限套下去的自由画布（编辑器的加段菜单里也挡了一道）。
  if (options.depth > 0 && isContainerSection(type)) {
    throw new Error("site.sections_invalid");
  }
  return buildSection(type, row, fallbackId, options);
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
  const def = getSectionDefinition(section.type);
  // 不认识的段（`unsupported` 占位）没有 schema 可压，原样带过去
  if (!def) return section;
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
  const def = getSectionDefinition(section.type);
  if (!def) return section;
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
function parseAreaSectionList(
  area: AreaSectionType,
  value: unknown,
  strict: boolean,
): SiteSection[] {
  const rows = Array.isArray(value) ? value : [];
  const options: ParseOptions = { depth: 0, strict };
  const sections: SiteSection[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const raw = row as Record<string, unknown>;

    try {
      if (raw.type === UNSUPPORTED_TYPE) {
        const parsed = parseUnsupported(raw, createSectionId(), options);
        // 复活出来的段得真能放进这个区域；放不进就是坏数据，丢（口径见 isKnownSectionType）
        if (
          parsed.type !== UNSUPPORTED_TYPE &&
          !getSectionDefinition(parsed.type)?.placements.includes(area)
        ) {
          throw new Error("site.sections_invalid");
        }
        sections.push(parsed);
        continue;
      }

      const type = raw.type;
      if (!isKnownSectionType(type)) {
        // 完全不认识：读路径兜住等模块回来，写路径拒收（口径见 parseUnsupported）
        if (strict) throw new Error("site.sections_invalid");
        sections.push(
          buildUnsupportedSection(
            { type: typeof type === "string" ? type : "", raw },
            createSectionId(),
          ),
        );
        continue;
      }
      if (!getSectionDefinition(type)?.placements.includes(area)) {
        throw new Error("site.sections_invalid");
      }
      sections.push(buildSection(type, raw, createSectionId(), options));
    } catch (error) {
      // 读路径逐段跳过：一段坏了不该把整个页头 / 页脚连坐重置
      if (strict) throw error;
    }
  }
  return ensureAreaBody(area, sections);
}

export function parseAreaSections(
  area: AreaSectionType,
  value: unknown,
): SiteSection[] {
  return parseAreaSectionList(area, value, true);
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

/**
 * 读库容错：逐段跳过 / 兜住，只有整体崩了才回落到一个空区域。
 *
 * 以前这里是「一段坏 → 整个页头页脚重置成默认」——租户配了半年的页脚，因为某一段
 * 引用了停用模块就整片消失。现在坏的那一段自己变占位，其余原样留着。
 */
export function safeAreaSections(
  area: AreaSectionType,
  value: unknown,
): SiteSection[] {
  try {
    return parseAreaSectionList(area, value, false);
  } catch {
    return [createSection(area)];
  }
}

export interface SectionLayout {
  /** 色块（背景 / 分隔线）铺到哪：`page` 居中限宽，`full` 通栏。 */
  width: "page" | "full";
  /** 正文铺到哪：`default` 跟随页宽，`narrow` 收窄一档，`full` 不限宽。 */
  contentWidth: "default" | "narrow" | "full";
  /** 色块**内**的四边留白（底色包住的那部分）。 */
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  /** 与上/下一段之间想要的间距；`null` 表示继承主题的「区块间距」。 */
  spacingAbove: number | null;
  spacingBelow: number | null;
  /**
   * 旧底色 token（muted/accent/outline）。新编辑只写 `bg_color`；
   * 存量与 band 默认仍可能带此字段。
   */
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
    paddingRight: settingNumber(settings, "padding_right", 0),
    paddingBottom: settingNumber(settings, "padding_bottom", 32),
    paddingLeft: settingNumber(settings, "padding_left", 0),
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
 *
 * 页面 section 另有 `innerBackgroundColor`（正文区）；块级恒为 `null`。
 */
export interface SurfaceStyle {
  /** 外层色块外壳（`.sec-band` / 卡片表面）；不含内边距环。 */
  backgroundColor: string | null;
  /** 内层正文区（`.sec-content`）含内边距环；仅页面 section。 */
  innerBackgroundColor: string | null;
  color: string | null;
  borderColor: string | null;
  /** 实际要画的边框宽度；`border_color` 有值而宽度为 0 时按 1px。 */
  borderWidth: number;
  /** `null` = 跟随渲染端默认圆角。 */
  borderRadius: number | null;
}

export function resolveSurfaceStyle(settings: SettingValues): SurfaceStyle {
  const backgroundColor = normalizeSiteColor(settingText(settings, "bg_color"));
  const innerBackgroundColor = normalizeSiteColor(
    settingText(settings, "inner_bg_color"),
  );
  const color = normalizeSiteColor(settingText(settings, "fg_color"));
  const borderColor = normalizeSiteColor(settingText(settings, "border_color"));
  const rawWidth = settingNumber(settings, "border_width", 0);
  const borderWidth =
    rawWidth > 0 ? rawWidth : borderColor !== null ? 1 : 0;
  const radiusRaw = settingNumber(settings, "radius", -4);
  return {
    backgroundColor,
    innerBackgroundColor,
    color,
    borderColor,
    borderWidth,
    borderRadius: radiusRaw < 0 ? null : radiusRaw,
  };
}

/** 外层是否有任何自定义外观（决定要不要加 has-surface 类 / 跳过 token 底色）。 */
export function hasCustomSurface(style: SurfaceStyle): boolean {
  return (
    style.backgroundColor !== null ||
    style.color !== null ||
    style.borderWidth > 0 ||
    style.borderRadius !== null
  );
}

/**
 * 落到 React `style` / SSR inline 的**外层**外观属性。
 *
 * CSS 变量留给需要在子元素继承的场景（如 `--sec-fg`）；直接属性给色块自己用。
 * 内层底色见 `contentSurfaceStyleCss`。
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

/** 正文区（`.sec-content`）内背景。 */
export function contentSurfaceStyleCss(
  style: SurfaceStyle,
): Record<string, string | number> {
  if (!style.innerBackgroundColor) return {};
  return {
    backgroundColor: style.innerBackgroundColor,
    "--sec-inner-bg": style.innerBackgroundColor,
  };
}

/** SSR：拼进 `style=""` 的片段（末尾不带分号之外的内容）。 */
function cssRecordToAttr(css: Record<string, string | number>): string {
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

export function surfaceStyleAttr(style: SurfaceStyle): string {
  return cssRecordToAttr(surfaceStyleCss(style));
}

export function contentSurfaceStyleAttr(style: SurfaceStyle): string {
  return cssRecordToAttr(contentSurfaceStyleCss(style));
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
