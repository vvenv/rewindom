import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@be-water/shared";

import { SITE } from "../shared/site.js";

import {
  applySiteStarter,
  setPageStatus,
  updateSite,
} from "./site.service.js";

/**
 * 确保默认租户有已发布的 Marketing CMS 站（产品主域前台）。
 *
 * 幂等：已有已发布首页则跳过；否则 apply `default` starter 并全部发布。
 */
export async function ensureDefaultMarketingSite(): Promise<void> {
  const existingPublishedHome = await prisma.marketingPage.findFirst({
    where: {
      tenant_id: DEFAULT_TENANT_ID,
      kind: "home",
      status: "published",
    },
    select: { id: true },
  });
  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id: DEFAULT_TENANT_ID },
    select: { published: true },
  });
  if (existingPublishedHome && site?.published) {
    return;
  }

  const applied = await applySiteStarter(DEFAULT_TENANT_ID, "default");
  await updateSite(DEFAULT_TENANT_ID, {
    site_name: SITE.name,
    tagline: SITE.tagline,
    published: true,
  });
  for (const page of applied.pages) {
    if (page.status !== "published") {
      await setPageStatus(DEFAULT_TENANT_ID, page.id, "published");
    }
  }
}
