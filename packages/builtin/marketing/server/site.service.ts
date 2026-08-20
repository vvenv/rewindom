import {
  type Prisma,
  type MarketingPage as MarketingPageRecord,
  type MarketingSite as MarketingSiteRecord,
} from "@rewindom/server-kernel/generated/prisma/client/client.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";
import { normalizeLocale, type AppLocale } from "@rewindom/shared";

import {
  DEFAULT_HOME_LAYOUT_KEY,
  getHomeLayout,
  isHomeLayoutRelevant,
  listHomeLayouts,
  resolveHomeLayout,
} from "../shared/home-layouts.js";
import { buildPresetSections } from "../shared/page-presets.js";
import {
  getPageTemplateKind,
  getPageTemplatePreset,
  HOME_PAGE_KIND,
  isStockTemplateDescription,
  isStockTemplateTitle,
  isTemplatePageKind,
  listPageTemplateKinds,
  NOT_FOUND_PAGE_KIND,
  resolveCatalogPageDescription,
  resolveCatalogPageTitle,
  relocalizeStockTemplateDescription,
  relocalizeStockTemplateTitle,
} from "../shared/page-templates.js";
import { mergeSectionsWithPreset } from "../shared/preset-merge.js";
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
  normalizeSiteAnalytics,
  renderSiteAnalyticsHtml,
} from "../shared/site-analytics.js";
import {
  canonicalizePageIdentity,
  marketingPagePath,
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
  type SaveSiteDraftBody,
  type SaveEditorDraftBody,
  parsePageVisibility,
  safePageSettings,
  type UpdateMarketingPageBody,
  type UpdateMarketingSiteBody,
} from "../shared/site-cms.js";
import {
  DEFAULT_HOME_PATH,
  isHomeablePath,
  isHomePathAvailable,
  normalizeHomePath,
} from "../shared/site-home.js";
import { resolvePageLocale, withSiteLocale } from "../shared/site-locale.js";
import { buildMinimalSiteChrome } from "../shared/site-starters.js";
import {
  applySiteThemeSettings,
  findSiteTheme,
} from "../shared/site-themes.js";
import { resolveThemeSettings } from "../shared/theme-sections.js";

import { resolveSectionEntitlements } from "./site-entitlements.js";
import { initializeTemplatePage } from "./site-init.service.js";
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
  safeSiteThemeSettings,
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
  persistablePresetCopy,
  resolvedStarterText,
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

async function assertHomePath(
  tenant_id: string,
  raw: string,
  entitlements: ReadonlySet<string>,
): Promise<string> {
  const path = normalizeHomePath(raw);
  if (!isHomeablePath(path) || !isHomePathAvailable(path, entitlements)) {
    throw new ValidationError("site.home_path_invalid");
  }
  if (path === DEFAULT_HOME_PATH) return path;

  const template = listPageTemplateKinds().find((item) => item.path === path);
  if (template) return path;

  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id),
    select: { kind: true, slug: true },
  });
  const exists = pages.some((page) => {
    const identity = canonicalizePageIdentity(page.kind, page.slug);
    return marketingPagePath(identity.kind, identity.slug) === path;
  });
  if (!exists) throw new ValidationError("site.home_path_invalid");
  return path;
}

async function retargetHomePath(
  tenant_id: string,
  fromPath: string,
  toPath: string,
): Promise<void> {
  if (fromPath === toPath) return;
  await prisma.marketingSite.updateMany({
    where: { tenant_id, home_path: fromPath },
    data: { home_path: toPath },
  });
}

/**
 * 已发布站点的首页挂载；无效或站点未发布则 `/` + 起步版式。
 *
 * 贡献路径生成公开 URL（事件雷达当首页时收到 `/`）也走这一份，
 * 不要另查草稿——访客看到的必须是已上线的那一版。
 */
export async function loadPublishedHomeMount(
  tenantId: string,
  entitlements: ReadonlySet<string>,
): Promise<{ homePath: string; homeLayoutKey: string }> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenantId, { published: true }),
    select: { home_path: true, home_layout_key: true },
  });
  if (!site) {
    return {
      homePath: DEFAULT_HOME_PATH,
      homeLayoutKey: DEFAULT_HOME_LAYOUT_KEY,
    };
  }
  const homeLayoutKey = site.home_layout_key || DEFAULT_HOME_LAYOUT_KEY;
  const homePath = normalizeHomePath(site.home_path);
  if (
    homePath === DEFAULT_HOME_PATH ||
    !isHomeablePath(homePath) ||
    !isHomePathAvailable(homePath, entitlements)
  ) {
    return { homePath: DEFAULT_HOME_PATH, homeLayoutKey };
  }
  return { homePath, homeLayoutKey };
}

/**
 * 访客请求的逻辑路径 → 实际要渲染的路径。
 *
 * 只在 `/` 上改写：存量把 `/events` 设为首页时，`/` 与 `/en/` 都去渲染 `/events`，
 * 但对外地址仍是 `/`（`servedPath`）。选了首页版式则 `home_path` 是 `/`，不改写。
 * 目标页开关关掉或路径不合法则回落默认首页。
 *
 * 模块可以把旧前缀 301 到根上（见 `canonicalRedirect`）；那是贡献方的事，
 * 这里仍然只改写 `/`。
 */
export async function resolveVisitorHomePath(input: {
  tenantId: string;
  path: string;
  entitlements: ReadonlySet<string>;
}): Promise<{
  logicalPath: string;
  servedPath: string;
  homePath: string;
  homeLayoutKey: string;
}> {
  const { homePath, homeLayoutKey } = await loadPublishedHomeMount(
    input.tenantId,
    input.entitlements,
  );
  if (input.path !== DEFAULT_HOME_PATH) {
    return {
      logicalPath: input.path,
      servedPath: input.path,
      homePath,
      homeLayoutKey,
    };
  }
  if (homePath === DEFAULT_HOME_PATH) {
    return {
      logicalPath: DEFAULT_HOME_PATH,
      servedPath: DEFAULT_HOME_PATH,
      homePath,
      homeLayoutKey,
    };
  }
  return {
    logicalPath: homePath,
    servedPath: DEFAULT_HOME_PATH,
    homePath,
    homeLayoutKey,
  };
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

async function presentPage(
  record: MarketingPageRecord,
  enabled?: ReadonlySet<string>,
): Promise<MarketingPage> {
  return toMarketingPage(
    record,
    enabled ?? (await resolveSectionEntitlements(record.tenant_id)),
  );
}

async function presentSite(
  record: MarketingSiteRecord,
  enabled?: ReadonlySet<string>,
): Promise<MarketingSite> {
  return toMarketingSite(
    record,
    enabled ?? (await resolveSectionEntitlements(record.tenant_id)),
  );
}

async function presentEditor(
  page: MarketingPageRecord,
  site: MarketingSiteRecord,
  enabled?: ReadonlySet<string>,
): Promise<{ page: MarketingPage; site: MarketingSite }> {
  const flags = enabled ?? (await resolveSectionEntitlements(page.tenant_id));
  return {
    page: toMarketingPage(page, flags),
    site: toMarketingSite(site, flags),
  };
}

/**
 * 页面目录 / 导航次序：`sort_order` 主序，`slug` 打破并列。
 *
 * 不能用 `title`（各语言标题不同、草稿标题与已发布标题也会漂），也不能用
 * `updated_at`（预览会跟最近改过的页走，实站却按另一套排）。与
 * `comparePublicCatalogPages` 同一口径。
 */
const PAGE_CATALOG_ORDER = [
  { sort_order: "asc" as const },
  { slug: "asc" as const },
];

async function presentPublicSite(
  siteRecord: MarketingSiteRecord,
  pages: MarketingPageRecord[],
  locale: AppLocale,
  options?: { draftChrome?: boolean; draftContent?: boolean },
): Promise<PublicMarketingSite> {
  return toPublicMarketingSite(siteRecord, pages, locale, {
    ...options,
    enabledEntitlements: await resolveSectionEntitlements(siteRecord.tenant_id),
  });
}

async function ensureSiteRow(tenant_id: string): Promise<MarketingSite> {
  const existing = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
  });
  if (existing) {
    return presentSite(existing);
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
  return presentSite(created);
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
  const enabled = await resolveSectionEntitlements(tenant_id);

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
      enabled,
    ) as unknown as Prisma.InputJsonValue;
  }
  if (body.footer !== undefined) {
    data.footer_draft_json = parseSiteAreaSections(
      "footer",
      body.footer,
      enabled,
    ) as unknown as Prisma.InputJsonValue;
  }
  if (body.published !== undefined) {
    data.published = Boolean(body.published);
  }
  if (body.home_path !== undefined) {
    if (typeof body.home_path !== "string") {
      throw new ValidationError("site.home_path_invalid");
    }
    data.home_path = await assertHomePath(tenant_id, body.home_path, enabled);
  }
  /*
   * 分析不进草稿 / 发布链：它是站点配置不是内容，配完就该生效。
   * 非法输入归一成「没配」而不是抛——填错的代价该是统计不生效，不是设置存不下去。
   */
  if (body.analytics !== undefined) {
    data.analytics = normalizeSiteAnalytics(
      body.analytics,
    ) as unknown as Prisma.InputJsonValue;
  }

  // 主题改动一律进**草稿**列，与页头页脚同一条发布链；线上那一列只有发布才动
  const nextTheme = resolveThemeSettings(existing.theme_settings_draft);

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
    data.theme_settings_draft = nextTheme as Prisma.InputJsonValue;
  }

  const updated = await prisma.marketingSite.update({
    where: { tenant_id },
    data,
  });
  return presentSite(updated, enabled);
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
  return presentPage(record);
}

/** 段流里某个 type 出现了几次（含容器段列里的子段）。 */
function countSectionsOfType(
  sections: readonly SiteSection[],
  type: string,
): number {
  let count = 0;
  for (const section of sections) {
    if (
      section.type === type ||
      (section.type === "unsupported" && section.source?.type === type)
    ) {
      count += 1;
    }
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
  const enabled = await resolveSectionEntitlements(tenant_id);
  const sections = parsePageSections(body.sections ?? [], enabled);
  const settings = parsePageSettings(body.settings ?? {});
  // 描述与标题同级必填：它是搜索结果 / 分享卡片里的那段摘要，也是 `page-header`
  // 段副标题留空时的回落源，留到「以后再补」基本等于永远不补
  const description = body.description?.trim();
  if (!description) {
    throw new ValidationError("site.page_description_required");
  }

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
    return presentPage(created, enabled);
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
 * 结构照搬。库存文案写成目标语言 catalog 句，租户改过的才把原文当翻译起点。
 * 复制出来的一律是**草稿**——还没译的内容不该跟着源页面直接上线。
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

  const requestedTitle = body.title?.trim();
  if (!requestedTitle) {
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
  const title = relocalizeStockTemplateTitle(kind, requestedTitle, locale);
  const slug = await resolveDuplicateSlug(tenant_id, kind, sourceSlug, locale);
  const enabled = await resolveSectionEntitlements(tenant_id);
  const sourceContent = pageContentDraft(source, enabled);
  const description = relocalizeStockTemplateDescription(
    kind,
    sourceContent.description,
    locale,
  ).trim();
  // 描述是必填的（见 `createPage`）：源页自己就没有、又没有版式预设可继承时，
  // 复制出来的会是一张过不了保存的页，不如当场说清楚先去补源页
  if (!description) {
    throw new ValidationError("site.page_description_required");
  }
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
        description,
        sections: sections as unknown as Prisma.InputJsonValue,
        settings: sourceContent.settings as unknown as Prisma.InputJsonValue,
        title_draft: title,
        description_draft: description,
        sections_draft: sections as unknown as Prisma.InputJsonValue,
        settings_draft:
          sourceContent.settings as unknown as Prisma.InputJsonValue,
        status: "draft",
        sort_order: source.sort_order,
      },
    });
    return presentPage(created, enabled);
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

  const enabled = await resolveSectionEntitlements(tenant_id);
  // 校验全部先做完再进事务：解析失败不该留下任何写入
  // 标题清空过不去：列表行、页面切换器、页头段的回落都指着它，存成空串等于把这
  // 页的入口做成一块点不到的空白（`createPage` / `updatePage` 早就是这条校验）
  const title = body.title.trim();
  if (!title) {
    throw new ValidationError("site.page_title_required");
  }
  const description = body.description.trim();
  if (!description) {
    throw new ValidationError("site.page_description_required");
  }
  const sections = parsePageSections(body.sections, enabled);
  assertTemplateRequiredSection(existing.kind, sections);
  const header = parseSiteAreaSections("header", body.header, enabled);
  const footer = parseSiteAreaSections("footer", body.footer, enabled);
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
        title_draft: title,
        description_draft: description,
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
        ...siteThemeDraftData(body),
      },
    }),
  ]);
  return presentEditor(page, site, enabled);
}

/**
 * 保存请求里带了主题就写草稿列，没带就不动——编辑器一次保存可能只改了正文。
 * 两个保存入口（带页面 / 不带页面）共用这一份，省得一边加了另一边忘了。
 *
 * `theme_key` 同理：编辑器里套用了主题包才带上，记录新的「出发点」，供
 * 「重设为最新主题」找回该包。
 */
function siteThemeDraftData(body: {
  theme_settings?: unknown;
  theme_key?: string;
}): { theme_settings_draft?: Prisma.InputJsonValue; theme_key?: string } {
  const data: {
    theme_settings_draft?: Prisma.InputJsonValue;
    theme_key?: string;
  } = {};
  if (body.theme_settings !== undefined) {
    data.theme_settings_draft = parseSiteThemeSettings(
      body.theme_settings,
    ) as Prisma.InputJsonValue;
  }
  if (body.theme_key !== undefined) {
    if (!findSiteTheme(body.theme_key)) {
      throw new ValidationError("site.theme_not_found");
    }
    data.theme_key = body.theme_key;
  }
  return data;
}

/**
 * 只保存**站点级**草稿（页头 / 页脚 / 主题），不动任何页面正文。
 *
 * 给编辑器在没打开任何页面时用——改导航或换配色不必先挑一个页面。
 */
export async function saveSiteDraft(
  tenant_id: string,
  body: SaveSiteDraftBody,
): Promise<MarketingSite> {
  await ensureSiteRow(tenant_id);
  const enabled = await resolveSectionEntitlements(tenant_id);
  const header = parseSiteAreaSections("header", body.header, enabled);
  const footer = parseSiteAreaSections("footer", body.footer, enabled);

  const site = await prisma.marketingSite.update({
    where: { tenant_id },
    data: {
      nav_draft_json: header as unknown as Prisma.InputJsonValue,
      footer_draft_json: footer as unknown as Prisma.InputJsonValue,
      ...siteThemeDraftData(body),
    },
  });
  return presentSite(site, enabled);
}

/**
 * 站点级草稿 → 线上：页头 / 页脚 / 主题一起上线，不影响任何页面正文。
 *
 * 主题跟着这条链而不是「一存就生效」：改配色是全站可见的动作，与改导航同一量级，
 * 没有理由让它绕过发布这一步。
 */
export async function publishSiteDraft(
  tenant_id: string,
): Promise<MarketingSite> {
  await ensureSiteRow(tenant_id);
  const existingSite = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });
  const enabled = await resolveSectionEntitlements(tenant_id);

  const site = await prisma.marketingSite.update({
    where: { tenant_id },
    data: {
      nav_json: siteChromeDraftHeader(
        existingSite,
        enabled,
      ) as unknown as Prisma.InputJsonValue,
      footer_json: siteChromeDraftFooter(
        existingSite,
        enabled,
      ) as unknown as Prisma.InputJsonValue,
      theme_settings: safeSiteThemeSettings(
        existingSite.theme_settings_draft,
      ) as Prisma.InputJsonValue,
    },
  });
  return presentSite(site, enabled);
}

/** 站点级草稿还原为线上那一版（页头 / 页脚 / 主题），不影响任何页面正文。 */
export async function revertSiteDraft(
  tenant_id: string,
): Promise<MarketingSite> {
  await ensureSiteRow(tenant_id);
  const existingSite = await prisma.marketingSite.findFirstOrThrow({
    where: { tenant_id },
  });
  const enabled = await resolveSectionEntitlements(tenant_id);

  const site = await prisma.marketingSite.update({
    where: { tenant_id },
    data: {
      nav_draft_json: siteChromePublishedHeader(
        existingSite,
        enabled,
      ) as unknown as Prisma.InputJsonValue,
      footer_draft_json: siteChromePublishedFooter(
        existingSite,
        enabled,
      ) as unknown as Prisma.InputJsonValue,
      theme_settings_draft: safeSiteThemeSettings(
        existingSite.theme_settings,
      ) as Prisma.InputJsonValue,
    },
  });
  return presentSite(site, enabled);
}

/**
 * 把页面**结构**重设为该 kind 的最新内置版式，尽量保留租户内容（合并语义见
 * `shared/preset-merge.ts`）。
 *
 * 只写草稿：结果先进编辑器让人过目，线上那一版一个字都不动——满意再发布，
 * 不满意「撤销更改」就回来了。title / description 也保留租户的，空了才用预设补。
 */
export async function resetPageToPreset(
  tenant_id: string,
  page_id: string,
): Promise<MarketingPage> {
  const existing = await prisma.marketingPage.findFirst({
    where: withTenantScope(tenant_id, { id: page_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.page_not_found");
  }

  const enabled = await resolveSectionEntitlements(tenant_id);
  const preset =
    existing.kind === HOME_PAGE_KIND
      ? resolveHomeLayout(
          (
            await prisma.marketingSite.findFirst({
              where: withTenantScope(tenant_id),
              select: { home_layout_key: true },
            })
          )?.home_layout_key,
          enabled,
        ).preset
      : getPageTemplatePreset(existing.kind);
  // 普通页面没有「官方最新版式」可言，重设无从谈起
  if (!preset) {
    throw new ValidationError("site.page_reset_unsupported");
  }

  const locale = normalizeLocale(existing.locale);
  const t = createStarterTranslator(locale);
  const draft = pageContentDraft(existing, enabled);
  const sections = parsePageSections(
    mergeSectionsWithPreset(draft.sections, preset, t),
    enabled,
  );
  assertTemplateRequiredSection(existing.kind, sections);

  const updated = await prisma.marketingPage.update({
    where: { id: existing.id, tenant_id },
    data: {
      sections_draft: sections as unknown as Prisma.InputJsonValue,
      title_draft: isStockTemplateTitle(
        existing.kind,
        existing.title_draft ?? "",
      )
        ? resolvedStarterText(t, preset.titleKey)
        : persistablePresetCopy(t, preset.titleKey, existing.title_draft),
      description_draft: isStockTemplateDescription(
        existing.kind,
        existing.description_draft ?? "",
      )
        ? resolvedStarterText(t, preset.descriptionKey)
        : persistablePresetCopy(
            t,
            preset.descriptionKey,
            existing.description_draft,
          ),
    },
  });
  return presentPage(updated, enabled);
}

/**
 * 把首页草稿换成指定的贡献版式，并把 `home_path` 收回 `/`。
 *
 * 只写首页草稿：访客仍看已发布的那一版，满意再发布。
 * 开关没开或 key 不认识直接拒。
 *
 * 首页不自动预建（`auto_init: false`），所以套用版式**也是**首页落库的时刻之一：
 * 选定一套版式就是租户对首页表态了，这之后中台里得有一张能改的页面，不能还停在
 * 「SSR 按 key 兜底渲染、列表里什么都没有」。
 */
export async function applyHomeLayout(
  tenant_id: string,
  key: string,
): Promise<MarketingSite> {
  const enabled = await resolveSectionEntitlements(tenant_id);
  const layout = getHomeLayout(key);
  if (!layout || !isHomeLayoutRelevant(layout, enabled)) {
    throw new ValidationError("site.home_layout_invalid");
  }

  await ensureSiteRow(tenant_id);
  await prisma.marketingSite.update({
    where: { tenant_id },
    data: { home_layout_key: key, home_path: DEFAULT_HOME_PATH },
  });

  // key 先写库：这里补建的首页会按**新**版式落库，与下面写草稿的内容一致
  await initializeTemplatePage(tenant_id, HOME_PAGE_KIND);

  const homes = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id, { kind: HOME_PAGE_KIND }),
  });
  for (const home of homes) {
    const t = createStarterTranslator(normalizeLocale(home.locale));
    const sections = parsePageSections(
      buildPresetSections(layout.preset, t),
      enabled,
    );
    await prisma.marketingPage.update({
      where: { id: home.id, tenant_id },
      data: {
        sections_draft: sections as unknown as Prisma.InputJsonValue,
        title_draft: resolvedStarterText(t, layout.preset.titleKey),
        description_draft: resolvedStarterText(
          t,
          layout.preset.descriptionKey,
        ),
      },
    });
  }

  const updated = await prisma.marketingSite.findFirstOrThrow({
    where: withTenantScope(tenant_id),
  });
  return presentSite(updated, enabled);
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

  const enabled = await resolveSectionEntitlements(tenant_id);
  const nextSections =
    body.sections !== undefined
      ? parsePageSections(body.sections, enabled)
      : undefined;
  if (nextSections) {
    assertTemplateRequiredSection(nextKind, nextSections);
  }

  const existingIdentity = canonicalizePageIdentity(
    existing.kind,
    existing.slug,
  );
  const previousPath = marketingPagePath(
    existingIdentity.kind,
    existingIdentity.slug,
  );
  const nextPath = marketingPagePath(nextKind, nextSlug);

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
          ? {
              description_draft: (() => {
                const d = body.description.trim();
                if (!d) throw new ValidationError("site.page_description_required");
                return d;
              })(),
            }
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
    if (previousPath !== nextPath) {
      await retargetHomePath(tenant_id, previousPath, nextPath);
    }
    return presentPage(updated, enabled);
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
  // 模板页（首页 / 文档版式 / 会员版式等）由系统在相关时快照落库，
  // 删掉就失去对应路由的可编辑版式；只许重设预设，不许删。
  if (isTemplatePageKind(existing.kind)) {
    throw new ConflictError("site.template_page_not_deletable");
  }
  const identity = canonicalizePageIdentity(existing.kind, existing.slug);
  const path = marketingPagePath(identity.kind, identity.slug);
  await prisma.$transaction([
    prisma.marketingSite.updateMany({
      where: { tenant_id, home_path: path },
      data: { home_path: DEFAULT_HOME_PATH },
    }),
    prisma.marketingPage.delete({ where: { id: page_id, tenant_id } }),
  ]);
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
  const enabled = await resolveSectionEntitlements(tenant_id);
  if (status === "published") {
    const promoted = promotePageContentData(existing, enabled);
    data.title = promoted.title;
    data.description = promoted.description;
    data.sections = promoted.sections as unknown as Prisma.InputJsonValue;
    data.settings = promoted.settings as unknown as Prisma.InputJsonValue;
  }
  const updated = await prisma.marketingPage.update({
    where: { id: page_id, tenant_id },
    data,
  });
  return presentPage(updated, enabled);
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
  const enabled = await resolveSectionEntitlements(tenant_id);

  const promoted = promotePageContentData(existingPage, enabled);
  const header = siteChromeDraftHeader(existingSite, enabled);
  const footer = siteChromeDraftFooter(existingSite, enabled);

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
          // 主题与页头页脚同属站点级草稿，一次发布一起上线
          theme_settings: safeSiteThemeSettings(
            existingSite.theme_settings_draft,
          ) as Prisma.InputJsonValue,
        },
      }),
    ]);
  });

  return presentEditor(page, site, enabled);
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
  const enabled = await resolveSectionEntitlements(tenant_id);

  const live = revertPageContentData(existingPage, enabled);
  const header = siteChromePublishedHeader(existingSite, enabled);
  const footer = siteChromePublishedFooter(existingSite, enabled);

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
        theme_settings_draft: safeSiteThemeSettings(
          existingSite.theme_settings,
        ) as Prisma.InputJsonValue,
      },
    }),
  ]);

  return presentEditor(page, site, enabled);
}

/**
 * 站点主语言：未配置时回落到代码兜底。公开面无前缀 URL 用它填 locale。
 */
export async function getSiteDefaultLocale(
  tenant_id: string,
): Promise<AppLocale> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
    select: { default_locale: true },
  });
  return normalizeLocale(site?.default_locale);
}

/**
 * 访客页语言：URL 前缀优先，没有前缀就用站点主语言。
 *
 * 贡献路径 / 会员 / 店面自己的 Fastify 路由都走这里，避免 `normalizeLocale(null)`
 * 掉到 `zh-CN`。
 */
export async function resolveVisitorPageLocale(
  tenant_id: string,
  requested: AppLocale | null | undefined,
): Promise<AppLocale> {
  return resolvePageLocale(requested, await getSiteDefaultLocale(tenant_id));
}

/**
 * 已发布站点的公开投影：**chrome 跟请求语言走**。
 *
 * 不要在这里做「一种语言都没有 CMS 页就整站回落默认语言」——`/en/shop` 这类
 * 贡献路径没有英文 MarketingPage 也能渲染，页头导航仍该是英文。CMS 正文缺译文
 * 的回落留在 `getPublishedPublicPage` 的 `effectiveLocale`。
 */
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
    orderBy: PAGE_CATALOG_ORDER,
  });
  return presentPublicSite(
    site,
    pages,
    locale == null
      ? normalizeLocale(site.default_locale)
      : normalizeLocale(locale, normalizeLocale(site.default_locale)),
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
  const published = await getPublishedPublicSite(
    tenant_id,
    tenant_slug,
    locale,
  );
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
    logo_url: resolveThemeSettings(site?.theme_settings).logo_url ?? null,
    primary_color: null,
    theme_settings: resolveThemeSettings(site?.theme_settings),
    // 会员登录这类页面同样是公开面，访客的一次访问不该因为官网没发布就不算数
    analytics_html: renderSiteAnalyticsHtml(site?.analytics),
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
async function buildDefaultHomePageView(input: {
  siteRecord: MarketingSiteRecord;
  pages: MarketingPageRecord[];
  locale: AppLocale;
  default_locale: AppLocale;
}): Promise<SitePageView> {
  const t = createStarterTranslator(input.locale);
  const enabled = await resolveSectionEntitlements(input.siteRecord.tenant_id);
  const layout = resolveHomeLayout(input.siteRecord.home_layout_key, enabled);
  const sections = buildPresetSections(layout.preset, t);
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
    site: await presentPublicSite(input.siteRecord, input.pages, input.locale),
    page: {
      slug: "home",
      locale: input.locale,
      kind: "home",
      title: resolvedStarterText(t, layout.preset.titleKey),
      description: resolvedStarterText(t, layout.preset.descriptionKey),
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
    orderBy: PAGE_CATALOG_ORDER,
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
      locale: current,
      default_locale,
    });
  }

  const isMembersOnly = parsePageVisibility(match.visibility) === "members";

  return {
    site: await presentPublicSite(siteRecord, pages, current),
    page: toPublicMarketingPage(match, {
      siblings: pages,
      defaultLocale: default_locale,
      // 公开 JSON 端点匿名：会员页只吐标题 + 摘要；SSR / page-html 再按 cookie 解锁
      memberSummary: isMembersOnly,
    }),
  };
}

/**
 * 模板页的**已发布**版式（文档库、会员登录页……由贡献模块登记）。
 *
 * 返回 `null` 表示租户从没自定义过——调用方回落自己的内置兜底版式，而不是渲染出
 * 一张空页。这正是「懒落库」的另一半：不存在 ≠ 没有版式。
 *
 * 语言回落：先找当前语言那一份，没有就用站点主语言的版式；标题 / 摘要按
 * **请求语言**解预设，避免 `/en/shop` 的页头还写着中文「商品」。
 *
 * `requireSite` 为 false 时**不要求站点已发布**。内容路径那种「站点的一部分」当然
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
  const matchLocale = normalizeLocale(match.locale, default_locale);
  const t = createStarterTranslator(locale);
  return {
    sections: localizeSections(content.sections, locale, default_locale),
    title: resolveCatalogPageTitle(kind, locale, content.title, {
      forcePreset: matchLocale !== locale,
      t,
    }),
    description: resolveCatalogPageDescription(
      kind,
      locale,
      content.description,
      {
        forcePreset: matchLocale !== locale,
        t,
      },
    ),
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
    orderBy: PAGE_CATALOG_ORDER,
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
    site: await presentPublicSite(siteRecord, pages, current),
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
  /**
   * 本站默认语言，用来在 `alternates` 里挑出 `x-default` 指向的那一条。
   *
   * 留空表示这条不发 `x-default`——单语言条目（贡献 provider 给的事件页）
   * 本来就只有一条 alternate，发了也无从互指。
   */
  default_locale?: string;
}

/**
 * 这套首页挂载把哪一段公开前缀收到了根上（没有就 undefined）。
 *
 * 与 events 的 `eventsMountedAtRoot` 同一条判据，但写在 marketing 且对所有版式通用：
 * 贡献模块不该各写一遍「我的前缀现在收到根上了」，marketing 自己就有 `rootPrefix`。
 *
 * 两种进法：选了声明 `rootPrefix` 的版式（`home_path=/`），或存量把该前缀直接设成首页。
 */
function rootMountedPrefix(
  homePath: string,
  homeLayoutKey: string | null | undefined,
  entitlements: ReadonlySet<string>,
): string | undefined {
  const normalized = normalizeHomePath(homePath);
  if (normalized === DEFAULT_HOME_PATH) {
    return resolveHomeLayout(homeLayoutKey, entitlements).rootPrefix;
  }
  return listHomeLayouts(entitlements).find(
    (layout) => layout.rootPrefix === normalized,
  )?.rootPrefix;
}

/** 路径是不是落在被收到根上的那段前缀里（这些地址一律 301 到 `/`）。 */
function isUnderPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
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
 * `logo_url` / `og_image` / `apple_touch_icon_url` / `maskable_icon_url` 不在包里
 * 也不被清空：那是品牌资产，不是外观风格，换个配色不该把 logo 抹掉。
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
  // 套主题包改的是**草稿**，与编辑器里逐项微调同一条链——发布才对访客生效
  const current = resolveThemeSettings(existing.theme_settings_draft);

  const site = await prisma.marketingSite.update({
    where: { tenant_id },
    data: {
      theme_settings_draft: applySiteThemeSettings(
        current,
        theme,
      ) as unknown as Prisma.InputJsonValue,
      // 记住「从哪个包出发」：主题包升级后「重设为最新主题」按它重新套
      theme_key: theme.key,
    },
  });
  return presentSite(site);
}

export async function getPublishedSitemapEntries(
  tenant_id: string,
): Promise<SitemapEntry[] | null> {
  const siteRecord = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id, { published: true }),
  });
  if (!siteRecord) return null;

  const [pages, entitlements] = await Promise.all([
    prisma.marketingPage.findMany({
      where: withTenantScope(tenant_id, { status: "published" }),
      orderBy: PAGE_CATALOG_ORDER,
    }),
    resolveSectionEntitlements(tenant_id),
  ]);
  const default_locale = normalizeLocale(siteRecord.default_locale);
  const mountedPrefix = rootMountedPrefix(
    siteRecord.home_path,
    siteRecord.home_layout_key,
    entitlements,
  );

  const entries = pages
    .filter((record) => parsePageVisibility(record.visibility) === "public")
    // 标了 noindex 还列进 sitemap 是自相矛盾的信号：一边请你来收，一边说别收
    .filter((record) => safePageSettings(record.settings).noindex !== true)
    // 404 模板会出现在无数死链上，不该作为一张真实 URL 进 sitemap
    .filter(
      (record) =>
        canonicalizePageIdentity(record.kind, record.slug).kind !==
        NOT_FOUND_PAGE_KIND,
    )
    // 模板路径（`/events/:slug`）不是能打开的地址：URL 编码成 `%3Aslug` 就是一条死链
    .filter(
      (record) => !marketingPagePath(record.kind, record.slug).includes(":"),
    )
    // 前缀被收到根上之后，`/events` 这类地址一律 301——sitemap 只列终态 URL
    .filter(
      (record) =>
        !mountedPrefix ||
        !isUnderPrefix(
          marketingPagePath(record.kind, record.slug),
          mountedPrefix,
        ),
    )
    .map((record) => {
      const view = toPublicMarketingPage(record, {
        siblings: pages,
        defaultLocale: default_locale,
      });
      return {
        path: withSiteLocale(view.path, view.locale, default_locale),
        updated_at: view.updated_at,
        alternates: view.alternates,
        default_locale,
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
    const allHomeLocales = [
      ...new Set([...publishedHomeLocales, ...siteLocales]),
    ];
    const alternates = allHomeLocales.map((locale) => ({
      locale,
      path: withSiteLocale("/", locale, default_locale),
    }));
    for (const locale of localesNeedingFallbackHome) {
      entries.unshift({
        path: withSiteLocale("/", locale, default_locale),
        updated_at: siteRecord.updated_at.toISOString(),
        alternates,
        default_locale,
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
    orderBy: PAGE_CATALOG_ORDER,
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
    site: await presentPublicSite(siteRecord, pages, current, {
      draftChrome: true,
      draftContent: true,
    }),
    page: toPublicMarketingPage(match, {
      siblings: pages,
      defaultLocale: default_locale,
      draftContent: true,
    }),
  };
}
