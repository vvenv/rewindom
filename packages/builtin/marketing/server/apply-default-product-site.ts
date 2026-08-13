import {
  type Prisma,
  type MarketingPage as MarketingPageRecord,
} from "@be-water/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";
import { DEFAULT_TENANT_ID } from "@be-water/shared";

import { buildDefaultProductSite } from "./default-product-site-content.js";
import { getOrCreateSite, setPageStatus } from "./site.service.js";
import {
  parsePageSections,
  parseSiteAreaSections,
  parseSiteThemeSettings,
  validateSiteLocale,
  validateSiteName,
  validateSiteTagline,
} from "./site.util.js";

/**
 * 把默认租户铺成 Rewindom 产品官网（首页，中英双语）并整站发布。
 *
 * 可反复执行：覆盖 chrome 与模板页正文，并删掉产品站曾自带的 `pricing` 页；
 * 不会删租户后来加的其它页面。
 */
export async function applyDefaultProductSite(
  tenant_id: string = DEFAULT_TENANT_ID,
): Promise<{ page_count: number }> {
  await getOrCreateSite(tenant_id);
  const payload = buildDefaultProductSite();

  const theme_settings = parseSiteThemeSettings(payload.site.theme_settings);
  const header = parseSiteAreaSections("header", payload.site.header);
  const footer = parseSiteAreaSections("footer", payload.site.footer);
  const default_locale = validateSiteLocale(
    payload.site.default_locale ?? "zh-CN",
  );
  const site_name = validateSiteName(payload.site.site_name, default_locale);
  const tagline = validateSiteTagline(payload.site.tagline, default_locale);

  const pageIds = await prisma.$transaction(async (tx) => {
    await tx.marketingSite.update({
      where: { tenant_id },
      data: {
        site_name: site_name as unknown as Prisma.InputJsonValue,
        tagline: tagline as unknown as Prisma.InputJsonValue,
        default_locale,
        theme_settings: theme_settings as unknown as Prisma.InputJsonValue,
        nav_json: header as unknown as Prisma.InputJsonValue,
        footer_json: footer as unknown as Prisma.InputJsonValue,
        nav_draft_json: header as unknown as Prisma.InputJsonValue,
        footer_draft_json: footer as unknown as Prisma.InputJsonValue,
        published: true,
      },
    });

    await tx.marketingPage.deleteMany({
      where: withTenantScope(tenant_id, { kind: "page", slug: "pricing" }),
    });

    const ids: string[] = [];
    for (const write of payload.pages) {
      const sections = parsePageSections(write.sections);
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
        sections: sections as unknown as Prisma.InputJsonValue,
        title_draft: write.title,
        description_draft: write.description,
        sections_draft: sections as unknown as Prisma.InputJsonValue,
        sort_order: write.sort_order,
      };

      let record: MarketingPageRecord;
      if (existing) {
        record = await tx.marketingPage.update({
          where: { id: existing.id, tenant_id },
          data,
        });
      } else {
        record = await tx.marketingPage.create({
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
        });
      }
      ids.push(record.id);
    }
    return ids;
  });

  // 发布放在事务外：复用 setPageStatus 的 promote 逻辑（站点 published 已在上面写入）
  for (const pageId of pageIds) {
    await setPageStatus(tenant_id, pageId, "published");
  }

  return { page_count: pageIds.length };
}
