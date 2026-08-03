import { ValidationError } from "@be-water/server-kernel/lib/app-errors.js";

import {
  RESERVED_PAGE_SLUGS,
  type MarketingPageKind,
  type SiteLinkItem,
} from "../shared/site-cms.js";
import {
  parseSections,
  parseThemeSettings,
  safeSections,
  safeThemeSettings,
  type SiteSection,
  type ThemeSettings,
} from "../shared/theme-sections.js";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;
const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u;

export function parseLinkList(value: unknown, field: string): SiteLinkItem[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new ValidationError("site.links_invalid", { field });
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new ValidationError("site.links_invalid", { field, index });
    }
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const href = typeof row.href === "string" ? row.href.trim() : "";
    if (!label || !href) {
      throw new ValidationError("site.links_invalid", { field, index });
    }
    return { label, href };
  });
}

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

export function safePageSections(value: unknown): SiteSection[] {
  return safeSections(value);
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
  if (kind === "home" || kind === "page" || kind === "doc") {
    return kind;
  }
  if (slug === "home") return "home";
  return "page";
}

export function validatePageSlug(kind: MarketingPageKind, slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (kind === "home") {
    if (normalized !== "home") {
      throw new ValidationError("site.home_slug_fixed");
    }
    return "home";
  }
  if (!SLUG_RE.test(normalized)) {
    throw new ValidationError("site.slug_invalid");
  }
  if (RESERVED_PAGE_SLUGS.has(normalized) && kind !== "doc") {
    throw new ValidationError("site.slug_reserved");
  }
  if (kind === "doc" && normalized === "home") {
    throw new ValidationError("site.slug_reserved");
  }
  return normalized;
}

export function validateSiteName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 120) {
    throw new ValidationError("site.name_invalid");
  }
  return trimmed;
}

export function validateOptionalColor(
  color: string | null | undefined,
): string | null | undefined {
  if (color === undefined) return undefined;
  if (color === null || color.trim() === "") return null;
  const trimmed = color.trim();
  if (!COLOR_RE.test(trimmed)) {
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
