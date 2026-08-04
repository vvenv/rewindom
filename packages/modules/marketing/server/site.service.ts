import { type Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";

import {
  marketingPagePath,
  type CreateMarketingPageBody,
  type MarketingPage,
  type MarketingPageListItem,
  type MarketingSite,
  type PublicMarketingPage,
  type PublicMarketingSite,
  type UpdateMarketingPageBody,
  type UpdateMarketingSiteBody,
} from "../shared/site-cms.js";
import { resolveThemeSettings } from "../shared/theme-sections.js";

import {
  toMarketingPage,
  toMarketingPageListItem,
  toMarketingSite,
  toPublicMarketingPage,
  toPublicMarketingSite,
} from "./site.mapper.js";
import {
  normalizePageKind,
  parsePageSections,
  parsePageSettings,
  parseSiteAreaSection,
  parseSiteThemeSettings,
  validateOptionalColor,
  validatePageSlug,
  validateSiteName,
} from "./site.util.js";

async function ensureSiteRow(tenant_id: string): Promise<MarketingSite> {
  const existing = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
  });
  if (existing) {
    return toMarketingSite(existing);
  }

  const created = await prisma.marketingSite.create({
    data: {
      tenant_id,
      site_name: "My Site",
      tagline: "",
      default_locale: "zh-CN",
      theme_settings: {},
      nav_json: [],
      footer_json: [],
      published: false,
    },
  });
  return toMarketingSite(created);
}

export async function getOrCreateSite(
  tenant_id: string,
): Promise<MarketingSite> {
  return ensureSiteRow(tenant_id);
}

export async function updateSite(
  tenant_id: string,
  body: UpdateMarketingSiteBody,
): Promise<MarketingSite> {
  await ensureSiteRow(tenant_id);
  const existing = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });

  const data: Record<string, unknown> = {};
  if (body.site_name !== undefined) {
    data.site_name = validateSiteName(body.site_name);
  }
  if (body.tagline !== undefined) {
    data.tagline = body.tagline.trim();
  }
  if (body.default_locale !== undefined) {
    const locale = body.default_locale.trim();
    if (!locale) throw new ValidationError("site.locale_invalid");
    data.default_locale = locale;
  }
  if (body.header !== undefined) {
    data.nav_json = parseSiteAreaSection(
      "header",
      body.header,
    ) as unknown as Prisma.InputJsonValue;
  }
  if (body.footer !== undefined) {
    data.footer_json = parseSiteAreaSection(
      "footer",
      body.footer,
    ) as unknown as Prisma.InputJsonValue;
  }
  if (body.published !== undefined) {
    data.published = Boolean(body.published);
  }

  const nextTheme = resolveThemeSettings({
    theme_settings: existing.theme_settings,
    logo_url: existing.logo_url,
    primary_color: existing.primary_color,
  });

  if (body.theme_settings !== undefined) {
    const parsed = parseSiteThemeSettings(body.theme_settings);
    Object.assign(nextTheme, parsed);
  }
  if (body.logo_url !== undefined) {
    nextTheme.logo_url =
      body.logo_url === null || body.logo_url.trim() === ""
        ? null
        : body.logo_url.trim();
  }
  if (body.primary_color !== undefined) {
    nextTheme.primary_color = validateOptionalColor(body.primary_color) ?? null;
  }

  if (
    body.theme_settings !== undefined ||
    body.logo_url !== undefined ||
    body.primary_color !== undefined
  ) {
    data.theme_settings = nextTheme as Prisma.InputJsonValue;
    data.logo_url = nextTheme.logo_url ?? null;
    data.primary_color = nextTheme.primary_color ?? null;
  }

  const updated = await prisma.marketingSite.update({
    where: { tenant_id },
    data,
  });
  return toMarketingSite(updated);
}

export async function listPages(
  tenant_id: string,
): Promise<MarketingPageListItem[]> {
  const records = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id),
    orderBy: [{ sort_order: "asc" }, { updated_at: "desc" }],
  });
  return records.map(toMarketingPageListItem);
}

export async function getPage(
  tenant_id: string,
  page_id: string,
): Promise<MarketingPage> {
  const record = await prisma.marketingPage.findFirst({
    where: withTenantScope(tenant_id, { id: page_id }),
  });
  if (!record) {
    throw new NotFoundError("site.page_not_found");
  }
  return toMarketingPage(record);
}

export async function createPage(
  tenant_id: string,
  body: CreateMarketingPageBody,
): Promise<MarketingPage> {
  await ensureSiteRow(tenant_id);
  const title = body.title?.trim();
  if (!title) {
    throw new ValidationError("site.page_title_required");
  }
  const kind = normalizePageKind(body.kind, body.slug);
  const slug = validatePageSlug(kind, body.slug);
  const locale = (body.locale ?? "zh-CN").trim() || "zh-CN";
  const sections = parsePageSections(body.sections ?? []);
  const settings = parsePageSettings(body.settings ?? {});

  if (kind === "home") {
    const existingHome = await prisma.marketingPage.findFirst({
      where: withTenantScope(tenant_id, { kind: "home", locale }),
    });
    if (existingHome) {
      throw new ConflictError("site.home_exists");
    }
  }

  try {
    const created = await prisma.marketingPage.create({
      data: {
        tenant_id,
        slug,
        locale,
        kind,
        title,
        description: body.description?.trim() ?? "",
        body_md: body.body_md ?? "",
        sections: sections as unknown as Prisma.InputJsonValue,
        settings: settings as unknown as Prisma.InputJsonValue,
        status: "draft",
        sort_order: body.sort_order ?? 0,
      },
    });
    return toMarketingPage(created);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new ConflictError("site.page_slug_conflict");
    }
    throw err;
  }
}

export async function updatePage(
  tenant_id: string,
  page_id: string,
  body: UpdateMarketingPageBody,
): Promise<MarketingPage> {
  const existing = await prisma.marketingPage.findFirst({
    where: withTenantScope(tenant_id, { id: page_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.page_not_found");
  }

  const nextKind = normalizePageKind(
    body.kind ?? existing.kind,
    body.slug ?? existing.slug,
  );
  const nextSlug = validatePageSlug(nextKind, body.slug ?? existing.slug);
  const nextLocale = (body.locale ?? existing.locale).trim() || "zh-CN";

  if (nextKind === "home" && existing.kind !== "home") {
    const otherHome = await prisma.marketingPage.findFirst({
      where: withTenantScope(tenant_id, {
        kind: "home",
        locale: nextLocale,
        NOT: { id: page_id },
      }),
    });
    if (otherHome) {
      throw new ConflictError("site.home_exists");
    }
  }

  try {
    const updated = await prisma.marketingPage.update({
      where: { id: page_id },
      data: {
        slug: nextSlug,
        locale: nextLocale,
        kind: nextKind,
        ...(body.title !== undefined
          ? {
              title: (() => {
                const t = body.title.trim();
                if (!t) throw new ValidationError("site.page_title_required");
                return t;
              })(),
            }
          : {}),
        ...(body.description !== undefined
          ? { description: body.description.trim() }
          : {}),
        ...(body.body_md !== undefined ? { body_md: body.body_md } : {}),
        ...(body.sections !== undefined
          ? {
              sections: parsePageSections(
                body.sections,
              ) as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(body.settings !== undefined
          ? {
              settings: parsePageSettings(
                body.settings,
              ) as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(body.sort_order !== undefined
          ? { sort_order: body.sort_order }
          : {}),
      },
    });
    return toMarketingPage(updated);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new ConflictError("site.page_slug_conflict");
    }
    throw err;
  }
}

export async function deletePage(
  tenant_id: string,
  page_id: string,
): Promise<void> {
  const existing = await prisma.marketingPage.findFirst({
    where: withTenantScope(tenant_id, { id: page_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.page_not_found");
  }
  await prisma.marketingPage.delete({ where: { id: page_id } });
}

export async function setPageStatus(
  tenant_id: string,
  page_id: string,
  status: "draft" | "published",
): Promise<MarketingPage> {
  const existing = await prisma.marketingPage.findFirst({
    where: withTenantScope(tenant_id, { id: page_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.page_not_found");
  }
  const updated = await prisma.marketingPage.update({
    where: { id: page_id },
    data: { status },
  });
  return toMarketingPage(updated);
}

export async function getPublishedPublicSite(
  tenant_id: string,
): Promise<PublicMarketingSite | null> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id, { published: true }),
  });
  if (!site) return null;

  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id, { status: "published" }),
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
  });
  return toPublicMarketingSite(site, pages);
}

export async function getPublishedPublicPage(
  tenant_id: string,
  path: string,
): Promise<{ site: PublicMarketingSite; page: PublicMarketingPage } | null> {
  const site = await getPublishedPublicSite(tenant_id);
  if (!site) return null;

  const normalized =
    path === "/" || path === ""
      ? "/"
      : path.endsWith("/") && path.length > 1
        ? path.slice(0, -1)
        : path;

  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id, { status: "published" }),
  });

  const match = pages.find((page) => {
    const kind =
      page.kind === "home" || page.kind === "doc" || page.kind === "page"
        ? page.kind
        : "page";
    return marketingPagePath(kind, page.slug) === normalized;
  });
  if (!match) return null;

  return { site, page: toPublicMarketingPage(match) };
}

/** 草稿预览：站点可不发布；页面可为 draft。 */
export async function getPreviewSitePage(
  tenant_id: string,
  path: string,
): Promise<{ site: PublicMarketingSite; page: PublicMarketingPage } | null> {
  await ensureSiteRow(tenant_id);
  const siteRecord = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });
  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id),
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
  });
  const site = toPublicMarketingSite(siteRecord, pages);

  const normalized =
    path === "/" || path === ""
      ? "/"
      : path.endsWith("/") && path.length > 1
        ? path.slice(0, -1)
        : path;

  const match = pages.find((page) => {
    const kind =
      page.kind === "home" || page.kind === "doc" || page.kind === "page"
        ? page.kind
        : "page";
    return marketingPagePath(kind, page.slug) === normalized;
  });
  if (!match) return null;

  return { site, page: toPublicMarketingPage(match) };
}
