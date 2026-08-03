/**
 * 本地 SEO SSR 冒烟：为指定 slug（默认 local → vvenv）发布首页。
 */
import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import {
  createPage,
  getOrCreateSite,
  setPageStatus,
  updateSite,
} from "../../../packages/modules/marketing/server/site.service.js";

async function main(): Promise<void> {
  const tenant =
    (await prisma.tenant.findFirst({ where: { slug: "local" } })) ??
    (await prisma.tenant.findFirst({ where: { slug: "vvenv" } }));
  if (!tenant) {
    throw new Error("no tenant local/vvenv");
  }
  console.log("tenant", tenant.slug, tenant.id);
  await getOrCreateSite(tenant.id);
  await updateSite(tenant.id, {
    site_name: "Local Tenant Site",
    tagline: "SEO SSR smoke test",
    published: true,
    nav: [{ label: "Docs", href: "/docs" }],
    footer: [{ label: "Login", href: "/login" }],
  });
  const pages = await prisma.marketingPage.findMany({
    where: { tenant_id: tenant.id },
  });
  let home = pages.find((p) => p.kind === "home");
  if (!home) {
    const created = await createPage(tenant.id, {
      kind: "home",
      slug: "home",
      title: "Welcome Home",
      description: "Tenant home for crawlers",
      body_md:
        "# Hello from tenant CMS\n\nThis paragraph must appear in SSR HTML.",
      home_blocks: {
        hero: {
          headline: "Hero Headline Unique",
          subhead: "Sub",
          cta_label: "Go",
          cta_href: "/login",
        },
      },
    });
    home = await prisma.marketingPage.findUniqueOrThrow({
      where: { id: created.id },
    });
  }
  await setPageStatus(tenant.id, home.id, "published");
  console.log("published home for", tenant.slug);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
