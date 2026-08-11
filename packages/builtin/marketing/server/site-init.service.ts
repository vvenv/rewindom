import { type Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";
import { normalizeLocale, type AppLocale } from "@be-water/shared";

import { buildPresetSections } from "../shared/page-presets.js";
import {
  getPageTemplatePreset,
  listPageTemplateKinds,
} from "../shared/page-templates.js";
import { buildSiteStarterChrome } from "../shared/site-starters.js";

import {
  parsePageSections,
  parseSiteAreaSections,
  parseSiteThemeSettings,
} from "./site.util.js";
import { createStarterTranslator } from "./starter-i18n.js";

export interface InitializeTenantSiteResult {
  created_site: boolean;
  /** 本次落库的页面，`kind`（都在站点默认语言下）。 */
  created_pages: string[];
}

/**
 * 把默认页面（首页 + 各注册模板页的内置版式）在**这一刻**快照进 DB。
 *
 * 动机：不落库的页面由 SSR 按代码里的最新预设兜底渲染，预设一升级，从没动过版式的
 * 租户站点就跟着变。建租户当下把版式落成真实记录，之后的预设更新只影响新租户；
 * 存量页面要跟进，走「重设为最新版式」的显式操作。
 *
 * 幂等：站点行已存在则不动它（chrome / 主题 / 站名都保留）；页面按 kind + 默认语言
 * 逐个补缺，已有的跳过。所以事件重放、回填脚本重跑都安全。
 *
 * @param page_status 新页面的状态。建租户走 `draft`（站点未发布，中台可见即可）；
 *   回填已发布站点时用 `published`——那些站点此前就靠兜底版式在线上渲染，落库的
 *   快照必须立即接管，否则官网内容凭空消失。
 * @param dry_run 只计算会创建什么、不写库（回填脚本先跑一遍确认命中范围）。
 */
export async function initializeTenantSite(
  tenant_id: string,
  default_locale: AppLocale,
  options?: { page_status?: "draft" | "published"; dry_run?: boolean },
): Promise<InitializeTenantSiteResult> {
  const page_status = options?.page_status ?? "draft";
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
  const created_pages: string[] = [];

  // entitlement 门槛的模板页不预建：没开通的租户在中台根本看不到这张页
  const templates = listPageTemplateKinds().filter(
    (template) => !template.entitlement,
  );

  for (const template of templates) {
    const preset = getPageTemplatePreset(template.kind);
    if (!preset) continue;

    const existing = await prisma.marketingPage.findFirst({
      where: withTenantScope(tenant_id, { kind: template.kind, locale }),
    });
    if (existing) continue;

    if (dry_run) {
      created_pages.push(template.kind);
      continue;
    }

    const title = t(preset.titleKey).trim();
    const description = t(preset.descriptionKey).trim();
    const sections = parsePageSections(buildPresetSections(preset, t));

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
          settings: {} as Prisma.InputJsonValue,
          title_draft: title,
          description_draft: description,
          sections_draft: sections as unknown as Prisma.InputJsonValue,
          settings_draft: {} as Prisma.InputJsonValue,
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

  return { created_site, created_pages };
}
