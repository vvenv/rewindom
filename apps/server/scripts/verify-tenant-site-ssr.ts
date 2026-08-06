import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import { getPublishedPublicPage } from "../../../packages/modules/marketing/server/site.service.js";
import { renderMarketingHtml } from "../../../packages/modules/marketing/server/ssr-render.js";

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "local" } });
  if (!tenant) throw new Error("tenant local missing");
  const result = await getPublishedPublicPage(tenant.id, "/");
  if (!result) throw new Error("no published home");
  const html = renderMarketingHtml({
    origin: "http://local.moms.plus",
    site: result.site,
    page: result.page,
  });
  const needles = [
    "Hero Headline Unique",
    "Hello from tenant CMS",
    "Local Tenant Site",
  ];
  const missing = needles.filter((s) => !html.includes(s));
  if (missing.length > 0) {
    throw new Error(`SSR missing: ${missing.join(", ")}`);
  }
  console.log("SSR_OK");
  console.log(html.match(/<title>[^<]+<\/title>/)?.[0]);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
