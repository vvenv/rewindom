import {
  type Prisma,
  type MarketingPage as MarketingPageRecord,
  type MarketingSite as MarketingSiteRecord,
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
import {
  buildHomeTemplateSections,
  HOME_STARTER_PRESET,
} from "../shared/page-presets.js";
import {
  getPageTemplateKind,
  isTemplatePageKind,
} from "../shared/page-templates.js";
import {
  getSectionDefinition,
  localizeSections,
  localizeSiteText,
  parseSiteNameValue,
  relocalizeSections,
  type SiteSection,
} from "../shared/section-schema.js";
import { collectSectionTypes } from "../shared/sections/collect-types.js";
import {
  canonicalizePageIdentity,
  marketingPagePath,
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
  type ReorderMarketingPagesBody,
  type SaveChromeDraftBody,
  type SaveEditorDraftBody,
  parsePageVisibility,
  safePageSettings,
  type UpdateMarketingPageBody,
  type UpdateMarketingSiteBody,
} from "../shared/site-cms.js";
import { withSiteLocale } from "../shared/site-locale.js";
import { buildMinimalSiteChrome, buildSiteStarter, findSiteStarter } from "../shared/site-starters.js";
import { findSiteTheme } from "../shared/site-themes.js";
import { resolveThemeSettings } from "../shared/theme-sections.js";

import { recordPageVersion } from "./site-page-version.service.js";
import {
  toMarketingPage,
  toMarketingPageListItem,
  toMarketingSite,
  toPublicMarketingPage,
  toPublicMarketingSite,
} from "./site.mapper.js";
import {
  pageContentDraft,
  pageContentPublished,
  parsePageSections,
  parsePageSettings,
  parseSiteAreaSections,
  parseSiteThemeSettings,
  promotePageContentData,
  resolvePageIdentity,
  revertPageContentData,
  siteChromeDraftFooter,
  siteChromeDraftHeader,
  siteChromePublishedFooter,
  siteChromePublishedHeader,
  validateOptionalColor,
  validatePageSlug,
  validateSiteLocale,
  validateSiteName,
  validateSiteTagline,
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

  const minimalChrome = buildMinimalSiteChrome();
  const header = parseSiteAreaSections("header", minimalChrome.header);
  const footer = parseSiteAreaSections("footer", minimalChrome.footer);

  const created = await prisma.marketingSite.create({
    data: {
      tenant_id,
      site_name: "My Site",
      tagline: "",
      default_locale: "zh-CN",
      theme_settings: {},
      nav_json: header as unknown as Prisma.InputJsonValue,
      footer_json: footer as unknown as Prisma.InputJsonValue,
      nav_draft_json: header as unknown as Prisma.InputJsonValue,
      footer_draft_json: footer as unknown as Prisma.InputJsonValue,
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
    data.tagline = validateSiteTagline(
      body.tagline,
      nextDefaultLocale,
    ) as Prisma.InputJsonValue;
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

/** 段流里某个 type 出现了几次（含容器段列里的子段）。 */
function countSectionsOfType(
  sections: readonly SiteSection[],
  type: string,
): number {
  let count = 0;
  for (const section of sections) {
    if (section.type === type) count += 1;
    for (const block of section.blocks ?? []) {
      if (block.sections) count += countSectionsOfType(block.sections, type);
    }
  }
  return count;
}

/**
 * 模板页的必备段：有且仅有一段。
 *
 * 它是这张模板存在的理由本身——会员登录版式里删掉登录表单，会员就再也登不进来了；
 * 留两段则是两个都能提交的表单，错误提示落在哪一个由 DOM 顺序决定。编辑器已经不给
 * 删（`SectionTree` 按 `required_section` 关掉删除），但校验必须**同时**落在服务端：
 * 中台之外还有 API，而这条约束一旦破掉，租户是在自己的登录页上发现的。
 *
 * 放进列里（`group` 的某一栏）是允许的：那是版式选择，不是把段删掉。
 */
function assertTemplateRequiredSection(
  kind: MarketingPageKind,
  sections: readonly SiteSection[],
): void {
  /*
   * 声明了 `page_kinds` 的段只能落在它自己那张页面上。
   *
   * 与必备段是同一条约束的两半：登录表单在别的页面上渲染不出有意义的东西，
   * 而编辑器的「添加区块」菜单已经按 kind 过滤过——这里补的是直接打 API 的那条路。
   */
  for (const type of collectSectionTypes(sections)) {
    const allowed = getSectionDefinition(type)?.page_kinds;
    if (allowed && !allowed.includes(kind)) {
      throw new ValidationError("site.section_page_kind_invalid");
    }
  }

  const required = getPageTemplateKind(kind)?.required_section;
  if (!required) return;
  if (countSectionsOfType(sections, required) !== 1) {
    throw new ValidationError("site.template_section_required");
  }
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

  if (isTemplatePageKind(kind)) {
    const existingTemplate = await prisma.marketingPage.findFirst({
      where: withTenantScope(tenant_id, { kind, locale }),
    });
    if (existingTemplate) {
      throw new ConflictError(
        kind === "home" ? "site.home_exists" : "site.template_page_exists",
      );
    }
  }
  assertTemplateRequiredSection(kind, sections);

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
        settings: settings as unknown as Prisma.InputJsonValue,
        title_draft: title,
        description_draft: description,
        sections_draft: sections as unknown as Prisma.InputJsonValue,
        settings_draft: settings as unknown as Prisma.InputJsonValue,
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
  // 首页 / 模板页的 slug 是固定的，同语言复制不出第二份
  if (isTemplatePageKind(kind)) {
    throw new ConflictError(
      kind === "home" ? "site.home_exists" : "site.template_page_exists",
    );
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
        settings: sourceContent.settings as unknown as Prisma.InputJsonValue,
        title_draft: title,
        description_draft: sourceContent.description,
        sections_draft: sections as unknown as Prisma.InputJsonValue,
        settings_draft:
          sourceContent.settings as unknown as Prisma.InputJsonValue,
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
  assertTemplateRequiredSection(existing.kind, sections);
  const header = parseSiteAreaSections("header", body.header);
  const footer = parseSiteAreaSections("footer", body.footer);
  const settings =
    body.settings !== undefined ? parsePageSettings(body.settings) : undefined;
  const visibility =
    body.visibility !== undefined
      ? parsePageVisibility(body.visibility)
      : undefined;

  const [page, site] = await prisma.$transaction([
    prisma.marketingPage.update({
      where: { id: page_id, tenant_id },
      data: {
        title_draft: body.title.trim(),
        description_draft: body.description.trim(),
        sections_draft: sections as unknown as Prisma.InputJsonValue,
        ...(settings !== undefined
          ? { settings_draft: settings as unknown as Prisma.InputJsonValue }
          : {}),
        ...(visibility !== undefined ? { visibility } : {}),
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

/**
 * 只保存页头页脚草稿，不动任何页面正文。
 *
 * 给独立的页头页脚编辑器用——不必为了改导航而打开某一页的 Theme Editor。
 */
export async function saveChromeDraft(
  tenant_id: string,
  body: SaveChromeDraftBody,
): Promise<MarketingSite> {
  await ensureSiteRow(tenant_id);
  const header = parseSiteAreaSections("header", body.header);
  const footer = parseSiteAreaSections("footer", body.footer);

  const site = await prisma.marketingSite.update({
    where: { tenant_id },
    data: {
      nav_draft_json: header as unknown as Prisma.InputJsonValue,
      footer_draft_json: footer as unknown as Prisma.InputJsonValue,
    },
  });
  return toMarketingSite(site);
}

/** 将页头页脚草稿发布到线上（不影响任何页面正文）。 */
export async function publishChrome(tenant_id: string): Promise<MarketingSite> {
  await ensureSiteRow(tenant_id);
  const existingSite = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });

  const header = siteChromeDraftHeader(existingSite);
  const footer = siteChromeDraftFooter(existingSite);

  const site = await prisma.marketingSite.update({
    where: { tenant_id },
    data: {
      nav_json: header as unknown as Prisma.InputJsonValue,
      footer_json: footer as unknown as Prisma.InputJsonValue,
    },
  });
  return toMarketingSite(site);
}

/** 将页头页脚草稿还原为线上版本（不影响任何页面正文）。 */
export async function revertChrome(tenant_id: string): Promise<MarketingSite> {
  await ensureSiteRow(tenant_id);
  const existingSite = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });

  const header = siteChromePublishedHeader(existingSite);
  const footer = siteChromePublishedFooter(existingSite);

  const site = await prisma.marketingSite.update({
    where: { tenant_id },
    data: {
      nav_draft_json: header as unknown as Prisma.InputJsonValue,
      footer_draft_json: footer as unknown as Prisma.InputJsonValue,
    },
  });
  return toMarketingSite(site);
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
  const site_name =
    payload.site.site_name !== undefined
      ? validateSiteName(payload.site.site_name, locale)
      : undefined;
  const tagline =
    payload.site.tagline !== undefined
      ? validateSiteTagline(payload.site.tagline, locale)
      : undefined;

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
        // `site_name` 是 `string | {__i18n}`，与 updateSite 一样要转成 Json 入参
        ...(site_name !== undefined && {
          site_name: site_name as unknown as Prisma.InputJsonValue,
        }),
        ...(tagline !== undefined && {
          tagline: tagline as unknown as Prisma.InputJsonValue,
        }),
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
                settings_draft: {} as Prisma.InputJsonValue,
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

  const nextSections =
    body.sections !== undefined ? parsePageSections(body.sections) : undefined;
  if (nextSections) {
    assertTemplateRequiredSection(nextKind, nextSections);
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
        ...(nextSections !== undefined
          ? {
              sections_draft: nextSections as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(body.settings !== undefined
          ? {
              settings_draft: parsePageSettings(
                body.settings,
              ) as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(body.visibility !== undefined
          ? { visibility: parsePageVisibility(body.visibility) }
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

/**
 * 一次写入整批页面的 `sort_order`，返回重排后的页面清单。
 *
 * `sort_order` 决定页头「全部一级页面」、`page-menu` 与 sitemap 的先后，是一组**相对
 * 关系**——所以整批一个事务写：逐页 PATCH 会在中途失败时留下一个谁也没要过的顺序。
 * 不属于本租户的 id 直接拒（而不是静默跳过），否则调用方以为排好了，实际少排了一页。
 */
export async function reorderPages(
  tenant_id: string,
  body: ReorderMarketingPagesBody,
): Promise<MarketingPageListItem[]> {
  const items = body?.items;
  if (!Array.isArray(items)) {
    throw new ValidationError("site.page_order_invalid");
  }
  const seen = new Set<string>();
  for (const item of items) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      !Number.isSafeInteger(item.sort_order) ||
      seen.has(item.id)
    ) {
      throw new ValidationError("site.page_order_invalid");
    }
    seen.add(item.id);
  }

  if (seen.size > 0) {
    const owned = await prisma.marketingPage.count({
      where: withTenantScope(tenant_id, { id: { in: [...seen] } }),
    });
    if (owned !== seen.size) {
      throw new NotFoundError("site.page_not_found");
    }
    await prisma.$transaction(
      items.map((item) =>
        prisma.marketingPage.update({
          where: { id: item.id, tenant_id },
          data: { sort_order: item.sort_order },
        }),
      ),
    );
  }

  return listPages(tenant_id);
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
    data.settings = promoted.settings as unknown as Prisma.InputJsonValue;
  }
  const updated = await prisma.marketingPage.update({
    where: { id: page_id, tenant_id },
    data,
  });
  return toMarketingPage(updated);
}

/** 将草稿页面内容发布到线上（页面须已是 `published` 状态）。 */
/**
 * 编辑器的一次发布：本页正文与站点级页头页脚**一起**上线，同一事务。
 *
 * 以前拆成两条链（`content/publish` + `chrome/publish`），工具栏因此长出两个状态、
 * 两个主按钮、两条撤销。而站长的心智只有一个：「把我刚才编辑的东西发出去」——
 * 页头本来就是他在这个编辑器里改的，分两次发只会让人以为已经发完了
 *（改完页头点发布、状态却说「线上已是最新」，正是这么来的）。
 *
 * 页头页脚是站点级的，所以它一并上线会影响所有页面——这由文案讲清楚，
 * 而不是靠拆成两个动作让人自己拼。
 */
export async function publishEditorDraft(
  tenant_id: string,
  page_id: string,
  /** 触发发布的人，进版本历史的「谁改的」一列。 */
  published_by = "",
): Promise<{ page: MarketingPage; site: MarketingSite }> {
  const existingPage = await prisma.marketingPage.findFirst({
    where: withTenantScope(tenant_id, { id: page_id }),
  });
  if (!existingPage) {
    throw new NotFoundError("site.page_not_found");
  }
  await ensureSiteRow(tenant_id);
  const existingSite = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });

  const promoted = promotePageContentData(existingPage);
  const header = siteChromeDraftHeader(existingSite);
  const footer = siteChromeDraftFooter(existingSite);

  const [page, site] = await prisma.$transaction(async (tx) => {
    /*
     * 留档与发布同一个事务：分开写的话，发布成功而留档失败会出现一版上线过、
     * 但历史里查不到的内容——回滚时看到的版本列表就是错的。
     */
    await recordPageVersion(tx, {
      tenant_id,
      page_id,
      title: promoted.title,
      description: promoted.description,
      sections: promoted.sections,
      settings: promoted.settings,
      created_by: published_by,
    });
    return Promise.all([
      tx.marketingPage.update({
        where: { id: page_id, tenant_id },
        data: {
          // 没上线过的页面顺带上线：对用户是同一个动作
          status: "published",
          title: promoted.title,
          description: promoted.description,
          sections: promoted.sections as unknown as Prisma.InputJsonValue,
          settings: promoted.settings as unknown as Prisma.InputJsonValue,
        },
      }),
      tx.marketingSite.update({
        where: { tenant_id },
        data: {
          nav_json: header as unknown as Prisma.InputJsonValue,
          footer_json: footer as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);
  });

  return { page: toMarketingPage(page), site: toMarketingSite(site) };
}

/**
 * 撤销未发布的更改：正文与页头页脚的草稿列一起回灌成线上列，同一事务。
 *
 * 与发布严格互为反向。没上线过的页面不动正文——无后缀列里躺的是建页初值，
 * 拿它当还原目标只会给出一个用户从没见过的版本；页头页脚则照常还原。
 */
export async function revertEditorDraft(
  tenant_id: string,
  page_id: string,
): Promise<{ page: MarketingPage; site: MarketingSite }> {
  const existingPage = await prisma.marketingPage.findFirst({
    where: withTenantScope(tenant_id, { id: page_id }),
  });
  if (!existingPage) {
    throw new NotFoundError("site.page_not_found");
  }
  await ensureSiteRow(tenant_id);
  const existingSite = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });

  const live = revertPageContentData(existingPage);
  const header = siteChromePublishedHeader(existingSite);
  const footer = siteChromePublishedFooter(existingSite);

  const [page, site] = await prisma.$transaction([
    prisma.marketingPage.update({
      where: { id: page_id, tenant_id },
      data:
        existingPage.status === "published"
          ? {
              title_draft: live.title,
              description_draft: live.description,
              sections_draft: live.sections as unknown as Prisma.InputJsonValue,
              settings_draft: live.settings as unknown as Prisma.InputJsonValue,
            }
          : {},
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
 * 「入口页」用的站点 chrome：站点已发布就用它的，否则给一份**最小可渲染**的。
 *
 * 会员登录页不是官网内容而是入口——租户还没发布官网时会员照样得能登录，那时
 * 不该因为「站点未发布」整页 404。拿不到已发布站点时退回一份只有站名与主题默认值
 * 的空 chrome：没有页头页脚，但表单、主题、语言这些照常。
 */
export async function getSiteChromeOrFallback(
  tenant_id: string,
  tenant_slug: string,
  fallbackName: string,
  locale?: AppLocale | null,
): Promise<PublicMarketingSite> {
  const published = await getPublishedPublicSite(tenant_id, tenant_slug, locale);
  if (published) return published;

  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
  });
  const defaultLocale = normalizeLocale(site?.default_locale);
  const effective = locale ?? defaultLocale;
  return {
    site_name:
      localizeSiteText(
        parseSiteNameValue(site?.site_name),
        effective,
        defaultLocale,
      ) || fallbackName,
    tagline: "",
    logo_url: await brandingLogoUrl(tenant_id, tenant_slug),
    primary_color: null,
    theme_settings: resolveThemeSettings(site?.theme_settings),
    default_locale: defaultLocale,
    locale: effective,
    available_locales: [defaultLocale],
    header: [],
    footer: [],
    pages: [],
  };
}

/**
 * 首页没有落库时的合成公开页：与文档模板页同一口径——站点已发布就有版式，
 * 不必先建一张空白页。
 */
function buildDefaultHomePageView(input: {
  siteRecord: MarketingSiteRecord;
  pages: MarketingPageRecord[];
  brandingLogoUrl: string | null;
  locale: AppLocale;
  default_locale: AppLocale;
}): SitePageView {
  const t = createStarterTranslator(input.locale);
  const sections = buildHomeTemplateSections(t);
  const homeSiblings = input.pages.filter((page) => page.kind === "home");
  const seen = new Set<AppLocale>();
  const alternates: PageLocaleAlternate[] = [];
  for (const page of homeSiblings) {
    const locale = normalizeLocale(page.locale, input.default_locale);
    if (seen.has(locale)) continue;
    seen.add(locale);
    alternates.push({
      locale,
      path: withSiteLocale("/", locale, input.default_locale),
    });
  }
  if (!seen.has(input.locale)) {
    alternates.push({
      locale: input.locale,
      path: withSiteLocale("/", input.locale, input.default_locale),
    });
  }
  alternates.sort(
    (a, b) =>
      (a.locale === input.default_locale ? 0 : 1) -
      (b.locale === input.default_locale ? 0 : 1),
  );

  return {
    site: toPublicMarketingSite(
      input.siteRecord,
      input.pages,
      input.brandingLogoUrl,
      input.locale,
    ),
    page: {
      slug: "home",
      locale: input.locale,
      kind: "home",
      title: t(HOME_STARTER_PRESET.titleKey),
      description: t(HOME_STARTER_PRESET.descriptionKey),
      sections,
      settings: {},
      visibility: "public",
      path: "/",
      alternates,
      updated_at: input.siteRecord.updated_at.toISOString(),
    },
  };
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
  if (!match) {
    if (normalized !== "/") return null;
    return buildDefaultHomePageView({
      siteRecord,
      pages,
      brandingLogoUrl: await brandingLogoUrl(tenant_id, tenant_slug),
      locale: current,
      default_locale,
    });
  }

  const isMembersOnly = parsePageVisibility(match.visibility) === "members";

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
      // 公开 JSON 端点匿名：会员页只吐标题 + 摘要；SSR / page-html 再按 cookie 解锁
      memberSummary: isMembersOnly,
    }),
  };
}

/**
 * 模板页的**已发布**版式（文档库的 `/docs`、会员登录页……）。
 *
 * 返回 `null` 表示租户从没自定义过——调用方回落自己的内置兜底版式，而不是渲染出
 * 一张空页。这正是「懒落库」的另一半：不存在 ≠ 没有版式。
 *
 * 语言回落：先找当前语言那一份，没有就用站点主语言的。
 *
 * `requireSite` 为 false 时**不要求站点已发布**。文档库那种「站点的一部分」当然
 * 要站点先发布，但会员登录页不是内容而是**入口**：租户还没发布官网时会员照样得
 * 能登录，那时用兜底版式渲染。
 */
export async function getPublishedTemplatePage(
  tenant_id: string,
  kind: MarketingPageKind,
  locale: AppLocale,
  options: { requireSite?: boolean } = {},
): Promise<{
  sections: SiteSection[];
  title: string;
  description: string;
} | null> {
  const template = getPageTemplateKind(kind);
  if (!template) return null;
  const siteRecord = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id, { published: true }),
  });
  if (!siteRecord && options.requireSite !== false) return null;
  const default_locale = normalizeLocale(siteRecord?.default_locale);

  const records = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id, {
      status: "published",
      kind,
      slug: template.slug,
    }),
  });
  const match =
    records.find(
      (record) => normalizeLocale(record.locale, default_locale) === locale,
    ) ??
    records.find(
      (record) =>
        normalizeLocale(record.locale, default_locale) === default_locale,
    );
  if (!match) return null;

  const content = pageContentPublished(match);
  return {
    sections: localizeSections(content.sections, locale, default_locale),
    title: content.title,
    description: content.description,
  };
}

/**
 * 会员已认证后拉受限页正文。与公开端点同一路径语义，但返回完整 sections。
 */
export async function getMemberContentPage(
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
/**
 * 套用一个主题包：只改 `theme_settings` 的外观 token，内容与品牌资产原样保留。
 *
 * 「主题」在这里是一组预设值而不是运行时的一层——写下去之后 `theme_settings` 仍是唯一
 * 真相源，租户接着微调哪一项就是哪一项（理由见 `shared/site-themes.ts`）。
 *
 * `logo_url` / `og_image` 不在包里也不被清空：那是品牌资产，不是外观风格，
 * 换个配色不该把 logo 抹掉。
 */
export async function applySiteTheme(
  tenant_id: string,
  theme_key: string,
): Promise<MarketingSite> {
  const theme = findSiteTheme(theme_key);
  if (!theme) throw new NotFoundError("site.theme_not_found");

  await ensureSiteRow(tenant_id);
  const existing = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });
  const current = resolveThemeSettings(existing.theme_settings);

  const site = await prisma.marketingSite.update({
    where: { tenant_id },
    data: {
      theme_settings: {
        ...current,
        ...theme.theme_settings,
        // 品牌资产穿过主题切换活下来
        logo_url: current.logo_url,
        og_image: current.og_image,
      } as unknown as Prisma.InputJsonValue,
    },
  });
  return toMarketingSite(site);
}

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

  const entries = pages
    .filter((record) => parsePageVisibility(record.visibility) === "public")
    // 标了 noindex 还列进 sitemap 是自相矛盾的信号：一边请你来收，一边说别收
    .filter((record) => safePageSettings(record.settings).noindex !== true)
    .map((record) => {
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

  const siteLocales = new Set<AppLocale>([default_locale]);
  for (const page of pages) {
    siteLocales.add(normalizeLocale(page.locale, default_locale));
  }
  const publishedHomeLocales = new Set(
    pages
      .filter((record) => record.kind === "home")
      .filter((record) => parsePageVisibility(record.visibility) === "public")
      .filter((record) => safePageSettings(record.settings).noindex !== true)
      .map((record) => normalizeLocale(record.locale, default_locale)),
  );
  const localesNeedingFallbackHome = [...siteLocales].filter(
    (locale) => !publishedHomeLocales.has(locale),
  );
  if (localesNeedingFallbackHome.length > 0) {
    const allHomeLocales = [...new Set([...publishedHomeLocales, ...siteLocales])];
    const alternates = allHomeLocales.map((locale) => ({
      locale,
      path: withSiteLocale("/", locale, default_locale),
    }));
    for (const locale of localesNeedingFallbackHome) {
      entries.unshift({
        path: withSiteLocale("/", locale, default_locale),
        updated_at: siteRecord.updated_at.toISOString(),
        alternates,
      });
    }
  }

  return entries;
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
