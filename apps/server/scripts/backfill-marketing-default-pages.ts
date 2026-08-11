/* eslint-disable no-console */
/**
 * 存量租户回填默认站点页面（首页 + 模板页）。
 *
 * 背景：这些页面以前不落库，SSR 直接按**代码里的**预设渲染——预设一升级，从没
 * 自定义过的租户站点就跟着变。新租户已改为建租户时快照落库（`tenant.created` →
 * `initializeTenantSite`）；本脚本把存量租户拉齐：
 *
 * - **已发布**站点缺的页面 → 按当前预设落成**已发布**页面（冻结现有渲染效果；
 *   这些站点此前就是靠兜底版式在线上渲染，落成草稿会让官网内容凭空消失）
 * - 未发布 / 无站点的租户 → 草稿初始化（与新租户同一条路径）
 *
 * 幂等：按 kind + 默认语言逐个补缺，已有的跳过，重复执行安全。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/backfill-marketing-default-pages.ts --dry-run
 *   pnpm --filter server exec tsx scripts/backfill-marketing-default-pages.ts
 */
import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import { initializeTenantSite } from "../../../packages/builtin/marketing/server/site-init.service.js";
import { getPlatformSettings } from "../../../packages/builtin/platform/server/services/platform-settings.service.js";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const { default_locale } = await getPlatformSettings();

  const tenants = await prisma.tenant.findMany({
    where: { status: { not: "archived" } },
    orderBy: { created_at: "asc" },
    select: { id: true, slug: true },
  });

  const publishedSites = new Set(
    (
      await prisma.marketingSite.findMany({
        where: { published: true },
        select: { tenant_id: true },
      })
    ).map((site) => site.tenant_id),
  );

  console.log(
    `[backfill-marketing-default-pages] tenants=${tenants.length} dry_run=${dryRun}`,
  );

  let touched = 0;
  for (const tenant of tenants) {
    const published = publishedSites.has(tenant.id);
    const result = await initializeTenantSite(tenant.id, default_locale, {
      // 已发布站点此前靠兜底版式在线上渲染，快照必须立即接管
      page_status: published ? "published" : "draft",
      dry_run: dryRun,
    });
    if (!result.created_site && result.created_pages.length === 0) continue;
    touched += 1;
    console.log(
      `  ${tenant.slug}: site=${result.created_site ? "create" : "keep"} ` +
        `pages=[${result.created_pages.join(", ")}] ` +
        `status=${published ? "published" : "draft"}`,
    );
  }

  console.log(
    `[backfill-marketing-default-pages] ${dryRun ? "would touch" : "touched"}=${touched}`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
