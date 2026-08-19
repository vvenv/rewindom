/* eslint-disable no-console */
/**
 * 把指定租户的官网标为已发布，并把全部草稿页上线（幂等）。
 *
 * 用法:
 *   pnpm --filter server exec tsx scripts/publish-tenant-site.ts --dry-run --slug yestino
 *   pnpm --filter server exec tsx scripts/publish-tenant-site.ts --slug yestino
 */
import {
  publishSiteDraft,
  setPageStatus,
  updateSite,
} from "@rewindom/builtin/marketing/server/site.service.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";


interface Args {
  dryRun: boolean;
  slug: string;
}

function parseArgs(argv: string[]): Args {
  let dryRun = false;
  let slug = "";
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token === "--slug" && i + 1 < argv.length) {
      slug = (argv[i + 1] ?? "").trim();
      i += 1;
    }
  }
  if (!slug) {
    throw new Error("需要 --slug <tenant-slug>");
  }
  return { dryRun, slug };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const tenant = await prisma.tenant.findUnique({
    where: { slug: args.slug },
    select: { id: true, slug: true, name: true, custom_domain: true },
  });
  if (!tenant) {
    throw new Error(`租户不存在: ${args.slug}`);
  }

  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id: tenant.id },
    select: { published: true, site_name: true },
  });
  if (!site) {
    throw new Error(`租户 ${args.slug} 没有官网`);
  }

  const pages = await prisma.marketingPage.findMany({
    where: { tenant_id: tenant.id },
    select: { id: true, slug: true, locale: true, kind: true, status: true },
    orderBy: [{ slug: "asc" }, { locale: "asc" }],
  });
  const draftPages = pages.filter((page) => page.status !== "published");

  console.log(
    `[publish-tenant-site] tenant=${tenant.slug} domain=${tenant.custom_domain ?? ""} published=${site.published} pages=${pages.length} draft=${draftPages.length}`,
  );
  for (const page of draftPages) {
    console.log(`  draft ${page.kind} /${page.slug} (${page.locale})`);
  }

  if (args.dryRun) {
    console.log("[publish-tenant-site] dry-run, no writes");
    return;
  }

  if (!site.published) {
    await updateSite(tenant.id, { published: true });
    console.log("[publish-tenant-site] site.published=true");
  }
  await publishSiteDraft(tenant.id);
  console.log("[publish-tenant-site] chrome/theme promoted");

  for (const page of draftPages) {
    await setPageStatus(tenant.id, page.id, "published");
    console.log(`  published ${page.kind} /${page.slug} (${page.locale})`);
  }

  console.log("[publish-tenant-site] done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
