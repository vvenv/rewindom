/* eslint-disable no-console */
/**
 * 给指定租户官网写 Google AdSense 发布商 ID（Auto ads）。
 *
 * 广告是站点配置，不进草稿 / 发布链，配完就生效。幂等：已经是同一个 ID 就跳过。
 *
 * 用法:
 *   pnpm --filter server exec tsx scripts/apply-yestino-ads.ts --dry-run
 *   pnpm --filter server exec tsx scripts/apply-yestino-ads.ts
 *   pnpm --filter server exec tsx scripts/apply-yestino-ads.ts --slug yestino --adsense ca-pub-4673397527808150
 */
import {
  extractGoogleAdsensePublisherId,
  normalizeSiteAds,
  parseSiteAds,
} from "@rewindom/builtin/marketing/shared/site-ads.js";
import { type Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

const DEFAULT_SLUG = "yestino";
const DEFAULT_PUBLISHER_ID = "ca-pub-4673397527808150";

interface Args {
  dryRun: boolean;
  slug: string;
  publisherId: string;
}

function parseArgs(argv: string[]): Args {
  let dryRun = false;
  let slug = DEFAULT_SLUG;
  let publisherId = DEFAULT_PUBLISHER_ID;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token === "--slug" && i + 1 < argv.length) {
      slug = (argv[i + 1] ?? "").trim();
      i += 1;
      continue;
    }
    if (token === "--adsense" && i + 1 < argv.length) {
      publisherId = (argv[i + 1] ?? "").trim();
      i += 1;
      continue;
    }
    if (token === "--help" || token === "-h") {
      console.log(
        "Usage: tsx scripts/apply-yestino-ads.ts [--dry-run] [--slug yestino] [--adsense ca-pub-…]",
      );
      process.exit(0);
    }
  }
  if (!slug) throw new Error("需要 --slug <tenant-slug>");
  const extracted = extractGoogleAdsensePublisherId(publisherId);
  if (!extracted) {
    throw new Error(`不是合法的 AdSense 发布商 ID: ${publisherId}`);
  }
  return { dryRun, slug, publisherId: extracted };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const tenant = await prisma.tenant.findUnique({
    where: { slug: args.slug },
    select: { id: true, slug: true, custom_domain: true },
  });
  if (!tenant) {
    throw new Error(`租户不存在: ${args.slug}`);
  }

  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id: tenant.id },
    select: { ads: true },
  });
  if (!site) {
    throw new Error(`租户 ${args.slug} 没有官网`);
  }

  const current = parseSiteAds(site.ads).google_adsense_publisher_id;
  const next = normalizeSiteAds({
    google_adsense_publisher_id: args.publisherId,
  });

  console.log(
    `[apply-yestino-ads] tenant=${tenant.slug} domain=${tenant.custom_domain ?? ""}`,
  );
  console.log(
    `[apply-yestino-ads] adsense ${current || "(off)"} → ${next.google_adsense_publisher_id}`,
  );

  if (current === next.google_adsense_publisher_id) {
    console.log("[apply-yestino-ads] already set, skip");
    return;
  }

  if (args.dryRun) {
    console.log("[apply-yestino-ads] dry-run, no writes");
    return;
  }

  await prisma.marketingSite.update({
    where: { tenant_id: tenant.id },
    data: { ads: next as unknown as Prisma.InputJsonValue },
  });
  console.log("[apply-yestino-ads] wrote ads");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
