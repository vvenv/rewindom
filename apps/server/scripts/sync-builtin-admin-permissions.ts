/**
 * 为所有租户内置「管理员」角色补齐当前模块权限目录中的缺失 key。
 * 幂等：可重复执行。
 *
 * Usage:
 *   pnpm --filter server exec tsx scripts/sync-builtin-admin-permissions.ts
 */
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { collectModulePermissions } from "@rewindom/server-kernel/runtime/collect-module-permissions.js";

import { ENABLED_SERVER_MODULES } from "../src/enabled-modules.js";

async function main(): Promise<void> {
  const catalog = collectModulePermissions([...ENABLED_SERVER_MODULES]);
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  let added = 0;

  for (const tenant of tenants) {
    const role = await prisma.role.findUnique({
      where: {
        scope_tenant_id_name: {
          scope: "tenant",
          tenant_id: tenant.id,
          name: "管理员",
        },
      },
      include: { role_permissions: { select: { permission: true } } },
    });
    if (!role) {
      console.log(`[skip] ${tenant.slug}: no 管理员 role`);
      continue;
    }
    const existing = new Set(role.role_permissions.map((r) => r.permission));
    const missing = catalog.tenantPermissionKeys.filter((k) => !existing.has(k));
    if (missing.length === 0) {
      console.log(`[ok] ${tenant.slug}: already complete`);
      continue;
    }
    await prisma.rolePermission.createMany({
      data: missing.map((permission) => ({ role_id: role.id, permission })),
      skipDuplicates: true,
    });
    added += missing.length;
    console.log(`[sync] ${tenant.slug}: +${missing.length} (${missing.join(", ")})`);
  }

  console.log(`Done. Added ${added} permission rows across ${tenants.length} tenants.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
