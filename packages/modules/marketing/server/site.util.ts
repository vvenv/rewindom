import { ValidationError } from "@be-water/server-kernel/lib/app-errors.js";
import { isAppLocale, type AppLocale } from "@be-water/shared";

import {
  localizeSiteText,
  parseAreaSections,
  parseSections,
  parseSiteNameValue,
  safeAreaSections,
  safeSections,
  type AreaSectionType,
  type LocalizedText,
  type SiteSection,
} from "../shared/section-schema.js";
import {
  canonicalizePageIdentity,
  parsePageSettings as parsePageSettingsSchema,
  RESERVED_PAGE_SLUGS,
  type MarketingPageKind,
  type MarketingPageSettings,
  type SiteLocalizedText,
} from "../shared/site-cms.js";
import {
  parseThemeSettings,
  safeThemeSettings,
  type ThemeSettings,
} from "../shared/theme-sections.js";

/** 单段 slug：字母数字开头结尾，中间可含连字符，最长 63。 */
const SEGMENT_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;
/** 最多三段，够用 `docs/guide/intro` 这类文档树。 */
const MAX_SLUG_SEGMENTS = 3;

export function parsePageSections(value: unknown): SiteSection[] {
  try {
    return parseSections(value);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("site.")) {
      throw new ValidationError(err.message);
    }
    throw new ValidationError("site.sections_invalid");
  }
}

export function parsePageSettings(value: unknown): MarketingPageSettings {
  try {
    return parsePageSettingsSchema(value);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("site.")) {
      throw new ValidationError(err.message);
    }
    throw new ValidationError("site.page_settings_invalid");
  }
}

export function safePageSections(value: unknown): SiteSection[] {
  return safeSections(value);
}

/** 页头 / 页脚区（各是一串 section）：写路径严格校验，失败转 ValidationError。 */
export function parseSiteAreaSections(
  area: AreaSectionType,
  value: unknown,
): SiteSection[] {
  try {
    return parseAreaSections(area, value);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("site.")) {
      throw new ValidationError(err.message);
    }
    throw new ValidationError("site.sections_invalid");
  }
}

export function safeSiteAreaSections(
  area: AreaSectionType,
  value: unknown,
): SiteSection[] {
  return safeAreaSections(area, value);
}

/** Theme Editor / 预览读草稿 chrome。 */
export function siteChromeDraftHeader(record: {
  nav_draft_json: unknown;
}): SiteSection[] {
  return safeSiteAreaSections("header", record.nav_draft_json);
}

export function siteChromeDraftFooter(record: {
  footer_draft_json: unknown;
}): SiteSection[] {
  return safeSiteAreaSections("footer", record.footer_draft_json);
}

/** 公开面读已发布 chrome。 */
export function siteChromePublishedHeader(record: {
  nav_json: unknown;
}): SiteSection[] {
  return safeSiteAreaSections("header", record.nav_json);
}

export function siteChromePublishedFooter(record: {
  footer_json: unknown;
}): SiteSection[] {
  return safeSiteAreaSections("footer", record.footer_json);
}

function chromeFingerprint(sections: SiteSection[]): string {
  return JSON.stringify(sections);
}

export function siteChromeIsDirty(record: {
  nav_json: unknown;
  footer_json: unknown;
  nav_draft_json: unknown;
  footer_draft_json: unknown;
}): boolean {
  return (
    chromeFingerprint(siteChromePublishedHeader(record)) !==
      chromeFingerprint(siteChromeDraftHeader(record)) ||
    chromeFingerprint(siteChromePublishedFooter(record)) !==
      chromeFingerprint(siteChromeDraftFooter(record))
  );
}

function pageContentFingerprint(parts: {
  title: string;
  description: string;
  sections: SiteSection[];
}): string {
  return JSON.stringify(parts);
}

/** Theme Editor / 预览读草稿页面内容。 */
export function pageContentDraft(record: {
  title_draft: string;
  description_draft: string;
  sections_draft: unknown;
}): { title: string; description: string; sections: SiteSection[] } {
  return {
    title: record.title_draft,
    description: record.description_draft,
    sections: safePageSections(record.sections_draft),
  };
}

/** 公开面读已发布页面内容。 */
export function pageContentPublished(record: {
  title: string;
  description: string;
  sections: unknown;
}): { title: string; description: string; sections: SiteSection[] } {
  return {
    title: record.title,
    description: record.description,
    sections: safePageSections(record.sections),
  };
}

export function pageContentIsDirty(record: {
  title: string;
  description: string;
  sections: unknown;
  title_draft: string;
  description_draft: string;
  sections_draft: unknown;
}): boolean {
  return (
    pageContentFingerprint(pageContentPublished(record)) !==
    pageContentFingerprint(pageContentDraft(record))
  );
}

/** 将草稿页面内容提升为已发布列（`publish` / `content/publish` 共用）。 */
export function promotePageContentData(record: {
  title_draft: string;
  description_draft: string;
  sections_draft: unknown;
}): {
  title: string;
  description: string;
  sections: SiteSection[];
} {
  const draft = pageContentDraft(record);
  return {
    title: draft.title,
    description: draft.description,
    sections: draft.sections,
  };
}

export function parseSiteThemeSettings(value: unknown): ThemeSettings {
  try {
    return parseThemeSettings(value);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("site.")) {
      throw new ValidationError(err.message);
    }
    throw new ValidationError("site.theme_settings_invalid");
  }
}

export function safeSiteThemeSettings(value: unknown): ThemeSettings {
  return safeThemeSettings(value);
}

export function normalizePageKind(
  kind: string | undefined,
  slug: string,
): MarketingPageKind {
  return canonicalizePageIdentity(kind, slug).kind;
}

export function validatePageSlug(
  kind: MarketingPageKind,
  slug: string,
): string {
  if (kind === "home") {
    const normalized = slug.trim().toLowerCase();
    if (normalized !== "home") {
      throw new ValidationError("site.home_slug_fixed");
    }
    return "home";
  }

  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/gu, "")
    .replace(/\/+/gu, "/");
  const segments = normalized.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    segments.length > MAX_SLUG_SEGMENTS ||
    !segments.every((segment) => SEGMENT_RE.test(segment))
  ) {
    throw new ValidationError("site.slug_invalid");
  }
  const root = segments[0]!;
  if (RESERVED_PAGE_SLUGS.has(root)) {
    throw new ValidationError("site.slug_reserved");
  }
  return segments.join("/");
}

/**
 * 写路径：先把存量 `doc` 收成 page，再按 schema 校验 slug。
 */
export function resolvePageIdentity(
  kind: string | undefined,
  slug: string,
): { kind: MarketingPageKind; slug: string } {
  const canonical = canonicalizePageIdentity(kind, slug);
  return {
    kind: canonical.kind,
    slug: validatePageSlug(canonical.kind, canonical.slug),
  };
}

/**
 * 写路径的 locale 校验。
 *
 * 必须收敛到 `APP_LOCALES`：任意字符串都能存的话，会写出一条**永远路由不到**的页面
 * ——URL 上的 locale 段只认已支持的语言。
 */
export function validateSiteLocale(value: string | undefined): AppLocale {
  const trimmed = (value ?? "").trim();
  if (!isAppLocale(trimmed)) {
    throw new ValidationError("site.locale_invalid");
  }
  return trimmed;
}

export function validateSiteName(
  value: unknown,
  defaultLocale: string,
): SiteLocalizedText {
  const parsed = parseSiteNameValue(value);
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed || trimmed.length > 120) {
      throw new ValidationError("site.name_invalid");
    }
    return trimmed;
  }

  const cleaned: LocalizedText = { __i18n: {} };
  for (const [locale, text] of Object.entries(parsed.__i18n)) {
    const trimmed = text.trim();
    if (trimmed.length > 120) {
      throw new ValidationError("site.name_invalid");
    }
    cleaned.__i18n[locale] = trimmed;
  }
  // 主语言槽位必须有值——渲染回落不能代替「主入口还没起名」
  const primary = cleaned.__i18n[defaultLocale]?.trim() ?? "";
  if (!primary) {
    throw new ValidationError("site.name_invalid");
  }
  // 只有主语言一项时收成纯字符串，单语言站点形状与以前一致
  const locales = Object.keys(cleaned.__i18n).filter(
    (locale) => (cleaned.__i18n[locale] ?? "") !== "",
  );
  if (locales.length === 1 && locales[0] === defaultLocale) {
    return primary;
  }
  return cleaned;
}

/** 审计 / CMS 列表等需要标量站名时，取主语言（缺译文再回落）。 */
export function displaySiteName(
  value: unknown,
  defaultLocale: string,
): string {
  return localizeSiteText(value, defaultLocale, defaultLocale);
}

export function validateOptionalColor(
  color: string | null | undefined,
): string | null | undefined {
  if (color === undefined) return undefined;
  if (color === null || color.trim() === "") return null;
  const trimmed = color.trim();
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u.test(trimmed)) {
    throw new ValidationError("site.color_invalid");
  }
  return trimmed;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
