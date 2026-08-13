/* eslint-disable no-console */
/**
 * 将误标为 tenant scope 的无租户审计行回填为 platform。
 *
 * 背景：平台管理员 LOGIN 等曾以 tenant_slug=null + scope=tenant 落库，
 * 再被 default 租户的「null 兼容」查询捞进租户端视图。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/backfill-audit-null-tenant-scope.ts --dry-run
 *   pnpm --filter server exec tsx scripts/backfill-audit-null-tenant-scope.ts
 */
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const where = {
    tenant_slug: null,
    scope: "tenant",
  } as const;

  const count = await prisma.auditLog.count({ where });
  console.log(
    `[backfill-audit-null-tenant-scope] matched=${count} dry_run=${dryRun}`,
  );

  if (count === 0) {
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    const sample = await prisma.auditLog.findMany({
      where,
      take: 10,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        username: true,
        action: true,
        created_at: true,
      },
    });
    console.log("[backfill-audit-null-tenant-scope] sample:", sample);
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.auditLog.updateMany({
    where,
    data: { scope: "platform" },
  });
  console.log(`[backfill-audit-null-tenant-scope] updated=${result.count}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
