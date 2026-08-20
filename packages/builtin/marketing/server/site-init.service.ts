import { type Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";
import { normalizeLocale, type AppLocale } from "@rewindom/shared";

import { getPlatformSettings } from "../../platform/server/services/platform-settings.service.js";
import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { resolveHomeLayout } from "../shared/home-layouts.js";
import { upgradeNotFoundSections } from "../shared/page-missing.js";
import { buildPresetSections } from "../shared/page-presets.js";
import {
  getPageTemplateKind,
  getPageTemplatePreset,
  isPageTemplateAutoInit,
  isPageTemplateRelevant,
  listPageTemplateKinds,
  NOT_FOUND_PAGE_KIND,
  NOT_FOUND_TEMPLATE_SLUG,
  HOME_PAGE_KIND,
} from "../shared/page-templates.js";
import { buildSiteStarterChrome } from "../shared/site-starters.js";

import {
  parsePageSections,
  parseSiteAreaSections,
  parseSiteThemeSettings,
  safePageSections,
} from "./site.util.js";
import {
  createStarterTranslator,
  resolvedStarterText,
} from "./starter-i18n.js";

export interface InitializeTenantSiteResult {
  created_site: boolean;
  /** 本次落库的页面，`kind`（都在站点默认语言下）。 */
  created_pages: string[];
}

/**
 * 把对该站点**已经相关**的模板页在这一刻快照进 DB。
 *
 * 「相关」= 没有 entitlement 的常驻页，或声明了 entitlement 且该开关已打开。不相关的
 * 不预建——没开通商店的站点不该有 `/shop` 版式记录。
 *
 * 相关也不一定就建：声明 `auto_init: false` 的模板（首页、会员三张）只在租户显式要它
 * 的那一刻落库——中台点「初始化版式」，或它的 entitlement 由关变开（`force_kinds`）。
 * 不建也没有缺口：SSR 照旧按内置预设兜底。
 *
 * 动机：不落库的页面由 SSR 按代码里的最新预设兜底渲染，预设一升级，从没动过版式的
 * 租户站点就跟着变。相关当下把版式落成真实记录，之后的预设更新只影响新快照；
 * 存量页面要跟进，走「重设为最新版式」的显式操作。
 *
 * 幂等：站点行已存在则不动它（chrome / 主题 / 站名都保留）；页面按 kind + 默认语言
 * 逐个补缺，已有的跳过。所以事件重放、回填脚本、打开 `/app/site` 再跑都安全。
 *
 * @param page_status 新页面的状态。省略时：站点已发布则 `published`（此前靠兜底版式
 *   在线上渲染，落成草稿会让官网内容凭空消失），否则 `draft`。建租户走默认即可。
 * @param dry_run 只计算会创建什么、不写库（回填脚本先跑一遍确认命中范围）。
 * @param force_kinds 这些 kind 连 `auto_init: false` 也要建（仍要过 entitlement）。
 * @param only_kinds 只看这几个 kind，并且一律当作被指名的（租户点「初始化版式」那条
 *   路）。指名初始化一张版式不该顺手把别的模板也快照出来，所以也跳过 404 的迁移与
 *   补段——那些属于「打开 /app/site 时顺带拉齐」。
 */
export async function initializeTenantSite(
  tenant_id: string,
  default_locale: AppLocale,
  options?: {
    page_status?: "draft" | "published";
    dry_run?: boolean;
    force_kinds?: readonly string[];
    only_kinds?: readonly string[];
  },
): Promise<InitializeTenantSiteResult> {
  const dry_run = options?.dry_run === true;

  let siteRecord = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
  });
  let created_site = false;

  if (!siteRecord) {
    const locale = normalizeLocale(default_locale);
    const t = createStarterTranslator(locale);
    const starterChrome = buildSiteStarterChrome("default");
    const header = parseSiteAreaSections("header", starterChrome.header);
    const footer = parseSiteAreaSections("footer", starterChrome.footer);
    const theme = parseSiteThemeSettings(starterChrome.theme_settings);

    created_site = true;
    if (dry_run) {
      // 不落库也要有一条能往下走的记录：页面遍历只用得到 default_locale
      siteRecord = { default_locale: locale } as NonNullable<typeof siteRecord>;
    } else {
      siteRecord = await prisma.marketingSite.create({
        data: {
          tenant_id,
          site_name: t("starter.default.site_name"),
          tagline: t("starter.default.tagline"),
          default_locale: locale,
          theme_settings: theme as unknown as Prisma.InputJsonValue,
          theme_settings_draft: theme as unknown as Prisma.InputJsonValue,
          theme_key: "default",
          nav_json: header as unknown as Prisma.InputJsonValue,
          footer_json: footer as unknown as Prisma.InputJsonValue,
          nav_draft_json: header as unknown as Prisma.InputJsonValue,
          footer_draft_json: footer as unknown as Prisma.InputJsonValue,
          published: false,
        },
      });
    }
  }

  const locale = normalizeLocale(siteRecord.default_locale);
  const t = createStarterTranslator(locale);
  const page_status =
    options?.page_status ?? (siteRecord.published ? "published" : "draft");
  const enabledEntitlements = await resolveTemplateEntitlements(tenant_id);
  const created_pages: string[] = [];

  const only = options?.only_kinds ? new Set(options.only_kinds) : null;

  /*
   * 旧约定：租户建一张 slug 为 `404` 的普通页就是自定义 404。升成模板 kind，
   * 才会出现在中台常驻模板区；不升的话快照会因 slug 唯一约束跳过，那张页永远
   * 卡在可排序目录里。
   */
  if (!dry_run && !only) {
    await prisma.marketingPage.updateMany({
      where: withTenantScope(tenant_id, {
        kind: "page",
        slug: NOT_FOUND_TEMPLATE_SLUG,
      }),
      data: { kind: NOT_FOUND_PAGE_KIND },
    });
  }

  const forced = new Set(options?.force_kinds ?? []);

  for (const template of listPageTemplateKinds()) {
    if (only && !only.has(template.kind)) continue;
    if (!isPageTemplateRelevant(template, enabledEntitlements)) continue;
    if (
      !only &&
      !isPageTemplateAutoInit(template) &&
      !forced.has(template.kind)
    ) {
      continue;
    }
    const preset =
      template.kind === HOME_PAGE_KIND
        ? resolveHomeLayout(
            "home_layout_key" in siteRecord
              ? siteRecord.home_layout_key
              : undefined,
            enabledEntitlements,
          ).preset
        : getPageTemplatePreset(template.kind);
    if (!preset) continue;

    const existing = await prisma.marketingPage.findFirst({
      where: withTenantScope(tenant_id, { kind: template.kind, locale }),
    });
    if (existing) continue;

    if (dry_run) {
      created_pages.push(template.kind);
      continue;
    }

    const title = resolvedStarterText(t, preset.titleKey);
    const description = resolvedStarterText(t, preset.descriptionKey);
    const sections = parsePageSections(buildPresetSections(preset, t));
    const settings =
      template.kind === NOT_FOUND_PAGE_KIND ? { noindex: true } : {};

    try {
      await prisma.marketingPage.create({
        data: {
          tenant_id,
          kind: template.kind,
          slug: template.slug,
          locale,
          title,
          description,
          sections: sections as unknown as Prisma.InputJsonValue,
          settings: settings as unknown as Prisma.InputJsonValue,
          title_draft: title,
          description_draft: description,
          sections_draft: sections as unknown as Prisma.InputJsonValue,
          settings_draft: settings as unknown as Prisma.InputJsonValue,
          status: page_status,
          sort_order: 0,
        },
      });
      created_pages.push(template.kind);
    } catch (err) {
      // (tenant_id, slug, locale) 撞上既有普通页面：保留租户的页面，跳过这张模板
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }

  if (!dry_run && !only) {
    await upgradeNotFoundTemplateSections(tenant_id);
  }

  return { created_site, created_pages };
}

/**
 * 站点已存在时用它的主语言；没有站点行时回落到平台默认语言。
 *
 * 开通 entitlement / 打开 `/app/site` 时调用方不一定带着 locale。
 *
 * @param force_kinds 见 `initializeTenantSite`；开关由关变开时带上那项功能的模板。
 */
export async function ensureTenantTemplatePages(
  tenant_id: string,
  force_kinds?: readonly string[],
): Promise<InitializeTenantSiteResult> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
  });
  const locale = site
    ? normalizeLocale(site.default_locale)
    : (await getPlatformSettings()).default_locale;
  return initializeTenantSite(tenant_id, locale, { force_kinds });
}

/**
 * 刚打开的这些 entitlement 名下、平时不自动落库的模板 kind。
 *
 * 「安装 / 启用某项功能」就是租户对那块版式的表态，这一刻替他建出来省得再点一次；
 * 平时（建租户、打开 `/app/site`）不建。开关**关掉**不删已落库的页面——版式是租户
 * 的内容，重新打开还要用。
 */
export function templateKindsForEnabledEntitlements(
  enabled_keys: readonly string[],
): string[] {
  if (enabled_keys.length === 0) return [];
  const keys = new Set(enabled_keys);
  return listPageTemplateKinds()
    .filter(
      (template) =>
        !isPageTemplateAutoInit(template) &&
        Boolean(template.entitlement) &&
        keys.has(template.entitlement!),
    )
    .map((template) => template.kind);
}

/**
 * 租户显式初始化一张模板页的版式（中台常驻模板区的「初始化版式」）。
 *
 * 只建**默认语言**那一行：其它语言按需在页面里「复制到其它语言」，与普通页面同一条路。
 * 已经落过库就原样返回，不覆盖租户改过的内容。
 */
export async function initializeTemplatePage(
  tenant_id: string,
  kind: string,
): Promise<InitializeTenantSiteResult> {
  const template = getPageTemplateKind(kind);
  if (!template || !getPageTemplatePreset(kind)) {
    throw new AppError({ code: "site.page_template_unknown", status: 404 });
  }
  const enabled = await resolveTemplateEntitlements(tenant_id);
  if (!isPageTemplateRelevant(template, enabled)) {
    throw new AppError({ code: "site.page_template_unavailable", status: 403 });
  }

  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
  });
  const locale = site
    ? normalizeLocale(site.default_locale)
    : (await getPlatformSettings()).default_locale;
  return initializeTenantSite(tenant_id, locale, { only_kinds: [kind] });
}

/**
 * 存量 404 页还没有必备段：打开 `/app/site` 时整页换成当前预设。
 */
async function upgradeNotFoundTemplateSections(
  tenant_id: string,
): Promise<void> {
  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id, { kind: NOT_FOUND_PAGE_KIND }),
  });
  for (const page of pages) {
    const t = createStarterTranslator(normalizeLocale(page.locale));
    const published = upgradeNotFoundSections(
      safePageSections(page.sections),
      t,
    );
    const draft = upgradeNotFoundSections(
      safePageSections(page.sections_draft),
      t,
    );
    if (!published && !draft) continue;
    await prisma.marketingPage.update({
      where: { id: page.id, tenant_id },
      data: {
        ...(published
          ? {
              sections: parsePageSections(
                published,
              ) as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(draft
          ? {
              sections_draft: parsePageSections(
                draft,
              ) as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
    });
  }
}

async function resolveTemplateEntitlements(
  tenant_id: string,
): Promise<ReadonlySet<string>> {
  const keys = [
    ...new Set(
      listPageTemplateKinds()
        .map((template) => template.entitlement)
        .filter((key): key is string => Boolean(key)),
    ),
  ];
  if (keys.length === 0) return new Set();

  const flags = await Promise.all(
    keys.map(
      async (key) =>
        [key, await isTenantModuleEnabled(tenant_id, key)] as const,
    ),
  );
  return new Set(flags.filter(([, on]) => on).map(([key]) => key));
}
