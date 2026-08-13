/**
 * 本地 SEO SSR 冒烟：为指定 slug（默认 local → vvenv）发布首页。
 */
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

import {
  createPage,
  getOrCreateSite,
  setPageStatus,
  updateSite,
} from "../../../packages/builtin/marketing/server/site.service.js";
import { parseAreaSection } from "../../../packages/builtin/marketing/shared/section-schema.js";

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
    header: parseAreaSection("header", [{ label: "Docs", href: "/docs" }]),
    footer: parseAreaSection("footer", [{ label: "Login", href: "/login" }]),
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
      sections: [
        {
          id: "smoke-hero",
          type: "hero",
          settings: {
            headline: "Hero Headline Unique",
            subhead: "Sub",
            primary_label: "Go",
            primary_href: "/login",
          },
          blocks: [],
        },
        {
          id: "smoke-features",
          type: "feature-grid",
          settings: { heading: "Feature Grid Heading", columns: 3 },
          blocks: [
            {
              id: "smoke-f1",
              type: "feature",
              settings: { icon: "Bot", title: "Feature One", body: "Body one" },
            },
          ],
        },
        {
          id: "smoke-prose",
          type: "prose",
          settings: {
            body_md:
              "# Hello from tenant CMS\n\nThis paragraph must appear in SSR HTML.",
          },
          blocks: [],
        },
      ],
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
