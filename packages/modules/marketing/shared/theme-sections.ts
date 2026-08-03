/** 租户官网 section 类型与校验（Theme Editor / SSR 共用）。布局原语，非业务语义。 */

export const SECTION_TYPES = [
  "hero",
  "prose",
  "cards",
  "split",
  "band",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const CARD_COLUMNS = [2, 3, 4] as const;
export type CardColumns = (typeof CARD_COLUMNS)[number];

export interface HeroSectionSettings {
  headline: string;
  subhead?: string;
  primary_label?: string;
  primary_href?: string;
}

export interface ProseSectionSettings {
  body_md: string;
}

export interface CardsSectionSettings {
  columns: CardColumns;
  items: Array<{
    title: string;
    body: string;
    href?: string;
  }>;
}

export interface SplitSectionSettings {
  title: string;
  body?: string;
  aside_md?: string;
  primary_label?: string;
  primary_href?: string;
}

export interface BandSectionSettings {
  headline: string;
  body?: string;
  primary_label?: string;
  primary_href?: string;
}

export type SectionSettingsByType = {
  hero: HeroSectionSettings;
  prose: ProseSectionSettings;
  cards: CardsSectionSettings;
  split: SplitSectionSettings;
  band: BandSectionSettings;
};

export type SiteSection = {
  [K in SectionType]: {
    id: string;
    type: K;
    settings: SectionSettingsByType[K];
  };
}[SectionType];

export const THEME_FONT_FAMILIES = ["system", "serif", "mono"] as const;
export type ThemeFontFamily = (typeof THEME_FONT_FAMILIES)[number];

export interface ThemeSettings {
  logo_url?: string | null;
  primary_color?: string | null;
  font_family?: ThemeFontFamily;
}

const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u;

/** 旧业务语义 type → 布局原语（读/写兼容）。 */
const LEGACY_SECTION_TYPE_MAP: Record<string, SectionType> = {
  features: "cards",
  cta: "band",
  richtext: "prose",
  markdown: "prose",
};

export function isSectionType(value: unknown): value is SectionType {
  return (
    typeof value === "string" &&
    (SECTION_TYPES as readonly string[]).includes(value)
  );
}

export function createSectionId(): string {
  return crypto.randomUUID();
}

export function createSection(type: SectionType): SiteSection {
  const id = createSectionId();
  switch (type) {
    case "hero":
      return { id, type, settings: { headline: "Welcome" } };
    case "prose":
      return { id, type, settings: { body_md: "" } };
    case "cards":
      return {
        id,
        type,
        settings: {
          columns: 3,
          items: [{ title: "Item", body: "" }],
        },
      };
    case "split":
      return {
        id,
        type,
        settings: { title: "Title", aside_md: "" },
      };
    case "band":
      return { id, type, settings: { headline: "Headline" } };
  }
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickLinkLabel(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.primary_label === "string") return raw.primary_label;
  if (typeof raw.cta_label === "string") return raw.cta_label;
  return undefined;
}

function pickLinkHref(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.primary_href === "string") return raw.primary_href;
  if (typeof raw.cta_href === "string") return raw.cta_href;
  return undefined;
}

function parseHeroSettings(raw: Record<string, unknown>): HeroSectionSettings {
  const headline = asTrimmedString(raw.headline);
  if (!headline) {
    throw new Error("site.sections_invalid");
  }
  const primary_label = pickLinkLabel(raw);
  const primary_href = pickLinkHref(raw);
  return {
    headline,
    ...(typeof raw.subhead === "string" ? { subhead: raw.subhead } : {}),
    ...(primary_label !== undefined ? { primary_label } : {}),
    ...(primary_href !== undefined ? { primary_href } : {}),
  };
}

function parseProseSettings(raw: Record<string, unknown>): ProseSectionSettings {
  return {
    body_md: typeof raw.body_md === "string" ? raw.body_md : "",
  };
}

function parseCardsSettings(raw: Record<string, unknown>): CardsSectionSettings {
  if (!Array.isArray(raw.items)) {
    throw new Error("site.sections_invalid");
  }
  const columnsRaw = raw.columns;
  const columns: CardColumns =
    columnsRaw === 2 || columnsRaw === 3 || columnsRaw === 4
      ? columnsRaw
      : columnsRaw === "2" || columnsRaw === "3" || columnsRaw === "4"
        ? (Number(columnsRaw) as CardColumns)
        : 3;

  const items = raw.items.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("site.sections_invalid");
    }
    const row = item as Record<string, unknown>;
    const title = asTrimmedString(row.title);
    if (!title) throw new Error("site.sections_invalid");
    const body =
      typeof row.body === "string"
        ? row.body.trim()
        : typeof row.description === "string"
          ? row.description.trim()
          : "";
    return {
      title,
      body,
      ...(typeof row.href === "string" && row.href.trim()
        ? { href: row.href.trim() }
        : {}),
    };
  });
  return { columns, items };
}

function parseSplitSettings(raw: Record<string, unknown>): SplitSectionSettings {
  const title = asTrimmedString(raw.title);
  if (!title) throw new Error("site.sections_invalid");
  const primary_label = pickLinkLabel(raw);
  const primary_href = pickLinkHref(raw);
  return {
    title,
    ...(typeof raw.body === "string" ? { body: raw.body } : {}),
    ...(typeof raw.aside_md === "string" ? { aside_md: raw.aside_md } : {}),
    ...(primary_label !== undefined ? { primary_label } : {}),
    ...(primary_href !== undefined ? { primary_href } : {}),
  };
}

function parseBandSettings(raw: Record<string, unknown>): BandSectionSettings {
  const headline = asTrimmedString(raw.headline);
  if (!headline) throw new Error("site.sections_invalid");
  const primary_label = pickLinkLabel(raw);
  const primary_href = pickLinkHref(raw);
  return {
    headline,
    ...(typeof raw.body === "string" ? { body: raw.body } : {}),
    ...(primary_label !== undefined ? { primary_label } : {}),
    ...(primary_href !== undefined ? { primary_href } : {}),
  };
}

function resolveSectionType(rawType: unknown): SectionType | null {
  if (typeof rawType !== "string") return null;
  if (isSectionType(rawType)) return rawType;
  return LEGACY_SECTION_TYPE_MAP[rawType] ?? null;
}

function parseOneSection(
  type: SectionType,
  id: string,
  settings: unknown,
): SiteSection {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("site.sections_invalid");
  }
  const raw = settings as Record<string, unknown>;
  switch (type) {
    case "hero":
      return { id, type, settings: parseHeroSettings(raw) };
    case "prose":
      return { id, type, settings: parseProseSettings(raw) };
    case "cards":
      return { id, type, settings: parseCardsSettings(raw) };
    case "split":
      return { id, type, settings: parseSplitSettings(raw) };
    case "band":
      return { id, type, settings: parseBandSettings(raw) };
  }
}

/** 写路径严格校验；失败抛 Error（code 字符串）由 service 转 ValidationError。 */
export function parseSections(value: unknown): SiteSection[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("site.sections_invalid");
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("site.sections_invalid");
    }
    const row = item as Record<string, unknown>;
    const type = resolveSectionType(row.type);
    if (!type) {
      throw new Error("site.sections_invalid");
    }
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : `section-${index}-${createSectionId()}`;
    return parseOneSection(type, id, row.settings);
  });
}

/** 读库容错。 */
export function safeSections(value: unknown): SiteSection[] {
  try {
    return parseSections(value);
  } catch {
    return [];
  }
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
    logo_url: fromJson.logo_url !== undefined ? fromJson.logo_url : input.logo_url,
    primary_color:
      fromJson.primary_color !== undefined
        ? fromJson.primary_color
        : input.primary_color,
    font_family: fromJson.font_family ?? "system",
  };
}

const COLOR_RE_SOFT = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u;

/**
 * 编辑器预览：draft 覆盖 base；主色仅在合法 hex 时覆盖（输入中途不闪回/不丢其它字段）。
 */
export function mergeThemeDraft(
  base: ThemeSettings,
  draft: ThemeSettings,
): ThemeSettings {
  const next: ThemeSettings = {
    ...base,
    ...draft,
    font_family: draft.font_family ?? base.font_family ?? "system",
  };

  if (draft.logo_url !== undefined) {
    next.logo_url = draft.logo_url;
  }

  if (draft.primary_color !== undefined) {
    if (draft.primary_color === null || draft.primary_color === "") {
      next.primary_color = null;
    } else if (COLOR_RE_SOFT.test(draft.primary_color.trim())) {
      next.primary_color = draft.primary_color.trim();
    } else {
      next.primary_color = base.primary_color ?? null;
    }
  }

  return next;
}

/** 旧 home_blocks → sections（迁移 / 兼容）。 */
export function homeBlocksToSections(home_blocks: unknown): SiteSection[] {
  if (!home_blocks || typeof home_blocks !== "object" || Array.isArray(home_blocks)) {
    return [];
  }
  const raw = home_blocks as Record<string, unknown>;
  const sections: SiteSection[] = [];

  if (raw.hero && typeof raw.hero === "object" && !Array.isArray(raw.hero)) {
    try {
      sections.push({
        id: createSectionId(),
        type: "hero",
        settings: parseHeroSettings(raw.hero as Record<string, unknown>),
      });
    } catch {
      /* skip invalid hero */
    }
  }

  if (Array.isArray(raw.features) && raw.features.length > 0) {
    try {
      sections.push({
        id: createSectionId(),
        type: "cards",
        settings: parseCardsSettings({ columns: 2, items: raw.features }),
      });
    } catch {
      /* skip invalid cards */
    }
  }

  return sections;
}

/**
 * 渲染用：sections 优先；若为空则用 body_md 回退为 prose section。
 */
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
      settings: { body_md: input.body_md ?? "" },
    },
  ];
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

export function cardsGridClass(columns: CardColumns): string {
  switch (columns) {
    case 2:
      return "sm:grid-cols-2";
    case 3:
      return "sm:grid-cols-2 lg:grid-cols-3";
    case 4:
      return "sm:grid-cols-2 lg:grid-cols-4";
  }
}
