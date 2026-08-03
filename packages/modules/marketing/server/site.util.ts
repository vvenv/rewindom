import { ValidationError } from "@be-water/server-kernel/lib/app-errors.js";

import {
  RESERVED_PAGE_SLUGS,
  type HomeBlocks,
  type MarketingPageKind,
  type SiteLinkItem,
} from "../shared/site-cms.js";

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

/** 读库时容错；写路径用 parseHomeBlocks。 */
export function safeHomeBlocks(value: unknown): HomeBlocks | null {
  try {
    return parseHomeBlocks(value);
  } catch {
    return null;
  }
}

export function parseHomeBlocks(value: unknown): HomeBlocks | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("site.home_blocks_invalid");
  }
  const raw = value as Record<string, unknown>;
  const out: HomeBlocks = {};

  if (raw.hero !== undefined && raw.hero !== null) {
    if (typeof raw.hero !== "object" || Array.isArray(raw.hero)) {
      throw new ValidationError("site.home_blocks_invalid");
    }
    const hero = raw.hero as Record<string, unknown>;
    const headline = typeof hero.headline === "string" ? hero.headline.trim() : "";
    if (!headline) {
      throw new ValidationError("site.home_blocks_invalid");
    }
    out.hero = {
      headline,
      ...(typeof hero.subhead === "string" ? { subhead: hero.subhead } : {}),
      ...(typeof hero.cta_label === "string"
        ? { cta_label: hero.cta_label }
        : {}),
      ...(typeof hero.cta_href === "string" ? { cta_href: hero.cta_href } : {}),
    };
  }

  if (raw.features !== undefined && raw.features !== null) {
    if (!Array.isArray(raw.features)) {
      throw new ValidationError("site.home_blocks_invalid");
    }
    out.features = raw.features.map((item) => {
      if (!item || typeof item !== "object") {
        throw new ValidationError("site.home_blocks_invalid");
      }
      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const description =
        typeof row.description === "string" ? row.description.trim() : "";
      if (!title) {
        throw new ValidationError("site.home_blocks_invalid");
      }
      return { title, description };
    });
  }

  return out;
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
