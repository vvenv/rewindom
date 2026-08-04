import {
  type Prisma,
  type MarketingPage as MarketingPageRecord,
} from "@be-water/server-kernel/generated/prisma/client/client.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";
import { normalizeLocale, type AppLocale } from "@be-water/shared";

import { getTenantBrandingUrls } from "../../platform/server/services/tenant-branding.service.js";
import { relocalizeSections } from "../shared/section-schema.js";
import {
  canonicalizePageIdentity,
  marketingPagePath,
  safePageSettings,
  type ApplySiteStarterResponse,
  type CreateMarketingPageBody,
  type DuplicateMarketingPageBody,
  type MarketingPage,
  type MarketingPageKind,
  type MarketingPageListItem,
  type MarketingSite,
  type PageLocaleAlternate,
  type PublicMarketingPage,
  type PublicMarketingSite,
  type SaveEditorDraftBody,
  type UpdateMarketingPageBody,
  type UpdateMarketingSiteBody,
} from "../shared/site-cms.js";
import { withSiteLocale } from "../shared/site-locale.js";
import {
  buildSiteStarter,
  findSiteStarter,
} from "../shared/site-starters.js";
import { resolveThemeSettings } from "../shared/theme-sections.js";

import {
  toMarketingPage,
  toMarketingPageListItem,
  toMarketingSite,
  toPublicMarketingPage,
  toPublicMarketingSite,
} from "./site.mapper.js";
import {
  pageContentDraft,
  parsePageSections,
  parsePageSettings,
  parseSiteAreaSections,
  parseSiteThemeSettings,
  promotePageContentData,
  resolvePageIdentity,
  validateOptionalColor,
  validatePageSlug,
  validateSiteLocale,
  validateSiteName,
} from "./site.util.js";
import {
  createStarterTranslator,
  starterLocaleForSite,
} from "./starter-i18n.js";

/** 公开读路径共用的返回形状。 */
export interface SitePageView {
  site: PublicMarketingSite;
  page: PublicMarketingPage;
}

function normalizePath(path: string): string {
  if (path === "/" || path === "") return "/";
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

function matchesPath(page: MarketingPageRecord, path: string): boolean {
  const { kind, slug } = canonicalizePageIdentity(page.kind, page.slug);
  return marketingPagePath(kind, slug) === path;
}

/**
 * 请求语言 → 本站真正要渲染的语言。
 *
 * 请求的语言一篇内容都没有时整站回落默认语言（`/en/...` 退化成默认语言站点，
 * canonical 会指回无前缀 URL）；有内容、只是**这一页**没译，则由调用方 404
 * ——那是「该语言存在但缺这一篇」，不该拿另一种语言的正文冒充。
 */
function effectiveLocale(
  requested: AppLocale | null | undefined,
  defaultLocale: AppLocale,
  pages: MarketingPageRecord[],
): AppLocale {
  if (!requested || requested === defaultLocale) return defaultLocale;
  const exists = pages.some(
    (page) => normalizeLocale(page.locale, defaultLocale) === requested,
  );
  return exists ? requested : defaultLocale;
}

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
      nav_draft_json: [],
      footer_draft_json: [],
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
  const nextDefaultLocale =
    body.default_locale !== undefined
      ? validateSiteLocale(body.default_locale)
      : normalizeLocale(existing.default_locale);
  if (body.site_name !== undefined) {
    data.site_name = validateSiteName(
      body.site_name,
      nextDefaultLocale,
    ) as Prisma.InputJsonValue;
  }
  if (body.tagline !== undefined) {
    data.tagline = body.tagline.trim();
  }
  if (body.default_locale !== undefined) {
    data.default_locale = nextDefaultLocale;
  }
  if (body.header !== undefined) {
    data.nav_draft_json = parseSiteAreaSections(
      "header",
      body.header,
    ) as unknown as Prisma.InputJsonValue;
  }
  if (body.footer !== undefined) {
    data.footer_draft_json = parseSiteAreaSections(
      "footer",
      body.footer,
    ) as unknown as Prisma.InputJsonValue;
  }
  if (body.published !== undefined) {
    data.published = Boolean(body.published);
  }

  const nextTheme = resolveThemeSettings(existing.theme_settings);

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
    // theme_settings 是唯一真相源；logo / 主色的独立列已随迁移删除
    data.theme_settings = nextTheme as Prisma.InputJsonValue;
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
  const { kind, slug } = resolvePageIdentity(body.kind, body.slug);
  // 显式传的要校验（脏值直接拒），没传的按站点默认语言归一（存量脏值不阻塞建页）
  const locale =
    body.locale !== undefined
      ? validateSiteLocale(body.locale)
      : normalizeLocale((await ensureSiteRow(tenant_id)).default_locale);
  const sections = parsePageSections(body.sections ?? []);
  const settings = parsePageSettings(body.settings ?? {});
  const description = body.description?.trim() ?? "";

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
        description,
        sections: sections as unknown as Prisma.InputJsonValue,
        title_draft: title,
        description_draft: description,
        sections_draft: sections as unknown as Prisma.InputJsonValue,
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

/**
 * 同语言复制时的候选 slug：`about` → `about-copy`；`docs/x` → `docs/x-copy`。
 *
 * 后缀加在最后一段上，并留出空间再截断，免得单段超过 63 字上限。
 */
function copySlugCandidates(slug: string): string[] {
  const parts = slug.split("/");
  const last = parts[parts.length - 1] ?? "page";
  const base = last.slice(0, 48).replace(/-+$/u, "") || "page";
  const prefix = parts.length > 1 ? `${parts.slice(0, -1).join("/")}/` : "";
  const candidates = [`${prefix}${base}-copy`];
  for (let index = 2; index <= 50; index += 1) {
    candidates.push(`${prefix}${base}-copy-${index}`);
  }
  return candidates;
}

/**
 * 复制目标的 slug。
 *
 * 复制到**另一种语言**时必须沿用源 slug——`(kind, slug)` 就是翻译组的 key，
 * 换了 slug 两行就不再互为译文（hreflang / 语言切换器都认不出来）。
 * 只有目标语言已经占了这个 slug（即同语言复制）才派生一个不冲突的。
 */
async function resolveDuplicateSlug(
  tenant_id: string,
  kind: MarketingPageKind,
  sourceSlug: string,
  locale: AppLocale,
): Promise<string> {
  const rows = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id, { locale }),
    select: { slug: true },
  });
  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(sourceSlug)) return sourceSlug;
  // 首页的 slug 是固定的 `home`，同语言复制不出第二份
  if (kind === "home") {
    throw new ConflictError("site.home_exists");
  }
  for (const candidate of copySlugCandidates(sourceSlug)) {
    if (taken.has(candidate)) continue;
    try {
      return validatePageSlug(kind, candidate);
    } catch {
      /* 保留字之类的候选跳过，换下一个 */
    }
  }
  throw new ConflictError("site.page_slug_conflict");
}

/**
 * 复制页面（主要用途：从一种语言快速铺出另一种语言的同一篇内容）。
 *
 * 结构照搬，文案把源语言的原文填进目标语言的槽位当翻译起点；复制出来的一律是
 * **草稿**——还没译的内容不该跟着源页面直接上线。
 */
export async function duplicatePage(
  tenant_id: string,
  page_id: string,
  body: DuplicateMarketingPageBody,
): Promise<MarketingPage> {
  const source = await prisma.marketingPage.findFirst({
    where: withTenantScope(tenant_id, { id: page_id }),
  });
  if (!source) {
    throw new NotFoundError("site.page_not_found");
  }

  const title = body.title?.trim();
  if (!title) {
    throw new ValidationError("site.page_title_required");
  }

  const site = await ensureSiteRow(tenant_id);
  const defaultLocale = normalizeLocale(site.default_locale);
  const sourceLocale = normalizeLocale(source.locale, defaultLocale);
  const locale =
    body.locale !== undefined ? validateSiteLocale(body.locale) : sourceLocale;
  const { kind, slug: sourceSlug } = canonicalizePageIdentity(
    source.kind,
    source.slug,
  );
  const slug = await resolveDuplicateSlug(tenant_id, kind, sourceSlug, locale);
  const sourceContent = pageContentDraft(source);
  const sections = relocalizeSections(
    sourceContent.sections,
    sourceLocale,
    locale,
    defaultLocale,
  );

  try {
    const created = await prisma.marketingPage.create({
      data: {
        tenant_id,
        slug,
        locale,
        kind,
        title,
        description: sourceContent.description,
        sections: sections as unknown as Prisma.InputJsonValue,
        title_draft: title,
        description_draft: sourceContent.description,
        sections_draft: sections as unknown as Prisma.InputJsonValue,
        settings: safePageSettings(
          source.settings,
        ) as unknown as Prisma.InputJsonValue,
        status: "draft",
        sort_order: source.sort_order,
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

/**
 * Theme Editor 的一次保存：页面内容与站点级页头页脚**一起写**。
 *
 * 以前编辑器连着发两个请求（先 page 再 site），第二个失败就留下「页面存了、
 * 页头没存」的半截状态，而用户只看到一句「页头保存失败」，根本不知道该重做哪一半。
 * 放进同一个事务，要么都成要么都不成。
 */
export async function saveEditorDraft(
  tenant_id: string,
  page_id: string,
  body: SaveEditorDraftBody,
): Promise<{ page: MarketingPage; site: MarketingSite }> {
  const existing = await prisma.marketingPage.findFirst({
    where: withTenantScope(tenant_id, { id: page_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.page_not_found");
  }
  await ensureSiteRow(tenant_id);

  // 校验全部先做完再进事务：解析失败不该留下任何写入
  const sections = parsePageSections(body.sections);
  const header = parseSiteAreaSections("header", body.header);
  const footer = parseSiteAreaSections("footer", body.footer);

  const [page, site] = await prisma.$transaction([
    prisma.marketingPage.update({
      where: { id: page_id, tenant_id },
      data: {
        title_draft: body.title.trim(),
        description_draft: body.description.trim(),
        sections_draft: sections as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.marketingSite.update({
      where: { tenant_id },
      data: {
        nav_draft_json: header as unknown as Prisma.InputJsonValue,
        footer_draft_json: footer as unknown as Prisma.InputJsonValue,
      },
    }),
  ]);
  return { page: toMarketingPage(page), site: toMarketingSite(site) };
}

/** 将草稿 chrome 发布到线上（公开面与已发布预览从此读取）。 */
export async function publishSiteChrome(
  tenant_id: string,
): Promise<MarketingSite> {
  await ensureSiteRow(tenant_id);
  const existing = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });
  const header = parseSiteAreaSections("header", existing.nav_draft_json);
  const footer = parseSiteAreaSections("footer", existing.footer_draft_json);
  const updated = await prisma.marketingSite.update({
    where: { tenant_id },
    data: {
      nav_json: header as unknown as Prisma.InputJsonValue,
      footer_json: footer as unknown as Prisma.InputJsonValue,
    },
  });
  return toMarketingSite(updated);
}

/**
 * 应用站点起步模板：chrome + 主题色 + 主语言下的若干页面**同一事务**落库。
 */
export async function applySiteStarter(
  tenant_id: string,
  key: string,
): Promise<ApplySiteStarterResponse> {
  if (!findSiteStarter(key)) {
    throw new ValidationError("site.starter_not_found");
  }

  const siteRow = await ensureSiteRow(tenant_id);
  const locale = starterLocaleForSite(siteRow.default_locale);
  const t = createStarterTranslator(locale);
  const payload = buildSiteStarter(key, t, locale);
  if (!payload) {
    throw new ValidationError("site.starter_not_found");
  }

  const theme_settings = parseSiteThemeSettings(payload.site.theme_settings);
  const header = parseSiteAreaSections("header", payload.site.header);
  const footer = parseSiteAreaSections("footer", payload.site.footer);

  const pageWrites = payload.pages.map((item) => {
    const title = t(item.preset.titleKey).trim();
    if (!title) {
      throw new ValidationError("site.page_title_required");
    }
    return {
      kind: item.preset.kind,
      slug: item.preset.slug,
      locale,
      title,
      description: t(item.preset.descriptionKey).trim(),
      sections: parsePageSections(item.sections),
      sort_order: item.sort_order,
    };
  });

  const result = await prisma.$transaction(async (tx) => {
    const site = await tx.marketingSite.update({
      where: { tenant_id },
      data: {
        theme_settings: theme_settings as unknown as Prisma.InputJsonValue,
        nav_json: header as unknown as Prisma.InputJsonValue,
        footer_json: footer as unknown as Prisma.InputJsonValue,
        nav_draft_json: header as unknown as Prisma.InputJsonValue,
        footer_draft_json: footer as unknown as Prisma.InputJsonValue,
      },
    });

    const pages: MarketingPageRecord[] = [];
    for (const write of pageWrites) {
      const existing = await tx.marketingPage.findFirst({
        where: withTenantScope(tenant_id, {
          kind: write.kind,
          slug: write.slug,
          locale: write.locale,
        }),
      });

      const data = {
        title: write.title,
        description: write.description,
        sections: write.sections as unknown as Prisma.InputJsonValue,
        title_draft: write.title,
        description_draft: write.description,
        sections_draft: write.sections as unknown as Prisma.InputJsonValue,
        sort_order: write.sort_order,
      };

      if (existing) {
        pages.push(
          await tx.marketingPage.update({
            where: { id: existing.id, tenant_id },
            data,
          }),
        );
      } else {
        if (write.kind === "home") {
          const otherHome = await tx.marketingPage.findFirst({
            where: withTenantScope(tenant_id, {
              kind: "home",
              locale: write.locale,
            }),
          });
          if (otherHome) {
            throw new ConflictError("site.home_exists");
          }
        }
        try {
          pages.push(
            await tx.marketingPage.create({
              data: {
                tenant_id,
                kind: write.kind,
                slug: write.slug,
                locale: write.locale,
                status: "draft",
                settings: {} as Prisma.InputJsonValue,
                ...data,
              },
            }),
          );
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
    }

    return { site, pages };
  });

  const mappedPages = result.pages.map(toMarketingPage);
  const homePage = mappedPages.find((page) => page.kind === "home");
  if (!homePage) {
    throw new ValidationError("site.starter_invalid");
  }

  return {
    site: toMarketingSite(result.site),
    pages: mappedPages,
    home_page_id: homePage.id,
  };
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

  const { kind: nextKind, slug: nextSlug } = resolvePageIdentity(
    body.kind ?? existing.kind,
    body.slug ?? existing.slug,
  );
  const nextLocale =
    body.locale !== undefined
      ? validateSiteLocale(body.locale)
      : normalizeLocale(existing.locale);

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
      // 带上 tenant_id：上面的存在性校验是 check-then-act，写入本身也要租户闭合
      where: { id: page_id, tenant_id },
      data: {
        slug: nextSlug,
        locale: nextLocale,
        kind: nextKind,
        ...(body.title !== undefined
          ? {
              title_draft: (() => {
                const t = body.title.trim();
                if (!t) throw new ValidationError("site.page_title_required");
                return t;
              })(),
            }
          : {}),
        ...(body.description !== undefined
          ? { description_draft: body.description.trim() }
          : {}),
        ...(body.sections !== undefined
          ? {
              sections_draft: parsePageSections(
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
  await prisma.marketingPage.delete({ where: { id: page_id, tenant_id } });
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
  const data: Prisma.MarketingPageUpdateInput = { status };
  if (status === "published") {
    const promoted = promotePageContentData(existing);
    data.title = promoted.title;
    data.description = promoted.description;
    data.sections = promoted.sections as unknown as Prisma.InputJsonValue;
  }
  const updated = await prisma.marketingPage.update({
    where: { id: page_id, tenant_id },
    data,
  });
  return toMarketingPage(updated);
}

/** 将草稿页面内容发布到线上（页面须已是 `published` 状态）。 */
export async function publishPageContent(
  tenant_id: string,
  page_id: string,
): Promise<MarketingPage> {
  const existing = await prisma.marketingPage.findFirst({
    where: withTenantScope(tenant_id, { id: page_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.page_not_found");
  }
  if (existing.status !== "published") {
    throw new ValidationError("site.page_not_published");
  }
  const promoted = promotePageContentData(existing);
  const updated = await prisma.marketingPage.update({
    where: { id: page_id, tenant_id },
    data: {
      title: promoted.title,
      description: promoted.description,
      sections: promoted.sections as unknown as Prisma.InputJsonValue,
    },
  });
  return toMarketingPage(updated);
}

/**
 * 官网 logo 默认继承租户品牌资产；没上传过时为 `null`，交由站点自己填的 URL 兜底。
 *
 * 不能直接把公开路径拼出来当默认值——没资产时那个端点是 404，会渲染成破图。
 */
async function brandingLogoUrl(
  tenant_id: string,
  tenant_slug: string,
): Promise<string | null> {
  const { logo_url } = await getTenantBrandingUrls(tenant_id, tenant_slug);
  return logo_url;
}

export async function getPublishedPublicSite(
  tenant_id: string,
  tenant_slug: string,
  locale?: AppLocale | null,
): Promise<PublicMarketingSite | null> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id, { published: true }),
  });
  if (!site) return null;

  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id, { status: "published" }),
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
  });
  return toPublicMarketingSite(
    site,
    pages,
    await brandingLogoUrl(tenant_id, tenant_slug),
    effectiveLocale(locale, normalizeLocale(site.default_locale), pages),
  );
}

/**
 * 公开页面：**按语言**选行。
 *
 * 这里以前只按 path 匹配，同一个 slug 存了两种语言时返回哪一行取决于数据库的
 * 物理顺序——`findMany` 连 `orderBy` 都没有。现在 locale 是选择条件的一部分。
 */
export async function getPublishedPublicPage(
  tenant_id: string,
  path: string,
  tenant_slug: string,
  locale?: AppLocale | null,
): Promise<SitePageView | null> {
  const siteRecord = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id, { published: true }),
  });
  if (!siteRecord) return null;

  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id, { status: "published" }),
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
  });

  const default_locale = normalizeLocale(siteRecord.default_locale);
  const current = effectiveLocale(locale, default_locale, pages);
  const normalized = normalizePath(path);

  const match = pages.find(
    (page) =>
      normalizeLocale(page.locale, default_locale) === current &&
      matchesPath(page, normalized),
  );
  if (!match) return null;

  return {
    site: toPublicMarketingSite(
      siteRecord,
      pages,
      await brandingLogoUrl(tenant_id, tenant_slug),
      current,
    ),
    page: toPublicMarketingPage(match, {
      siblings: pages,
      defaultLocale: default_locale,
    }),
  };
}

export interface SitemapEntry {
  /** 已带 locale 前缀的实际 URL 路径。 */
  path: string;
  updated_at: string;
  alternates: PageLocaleAlternate[];
}

/**
 * sitemap 条目：**所有**语言各一条，每条再挂上互指的 hreflang 备选。
 *
 * 不能复用 `getPublishedPublicSite().pages`——那份按语言过滤过，只会输出一种语言；
 * 而过滤之前的原始清单又会让同一个 `path` 重复出现（每种语言一条、路径完全相同）。
 */
export async function getPublishedSitemapEntries(
  tenant_id: string,
): Promise<SitemapEntry[] | null> {
  const siteRecord = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id, { published: true }),
  });
  if (!siteRecord) return null;

  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id, { status: "published" }),
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
  });
  const default_locale = normalizeLocale(siteRecord.default_locale);

  return pages.map((record) => {
    const view = toPublicMarketingPage(record, {
      siblings: pages,
      defaultLocale: default_locale,
    });
    return {
      path: withSiteLocale(view.path, view.locale, default_locale),
      updated_at: view.updated_at,
      alternates: view.alternates,
    };
  });
}

/** 草稿预览：站点可不发布；页面可为 draft；chrome 读草稿列。 */
export async function getPreviewSitePage(
  tenant_id: string,
  path: string,
  tenant_slug: string,
  locale?: AppLocale | null,
): Promise<SitePageView | null> {
  await ensureSiteRow(tenant_id);
  const siteRecord = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });
  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id),
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
  });

  const default_locale = normalizeLocale(siteRecord.default_locale);
  // 预览要能看**任意**语言（哪怕还一篇都没发），所以不走 effectiveLocale 的回落
  const current = normalizeLocale(locale, default_locale);
  const normalized = normalizePath(path);

  const match = pages.find(
    (page) =>
      normalizeLocale(page.locale, default_locale) === current &&
      matchesPath(page, normalized),
  );
  if (!match) return null;

  return {
    site: toPublicMarketingSite(
      siteRecord,
      pages,
      await brandingLogoUrl(tenant_id, tenant_slug),
      current,
      { draftChrome: true, draftContent: true },
    ),
    page: toPublicMarketingPage(match, {
      siblings: pages,
      defaultLocale: default_locale,
      draftContent: true,
    }),
  };
}
