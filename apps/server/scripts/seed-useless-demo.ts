/* eslint-disable no-console */
/**
 * 给指定站点铺一批无用句子，并开通 useless 模块。
 *
 * 幂等，可重复执行。正文已存在的会跳过。
 *
 *   pnpm --filter server exec tsx scripts/seed-useless-demo.ts [tenantSlug]
 */
import { RoleService } from "@rewindom/builtin/rbac/server/role.service.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { collectModulePermissions } from "@rewindom/server-kernel/runtime/collect-module-permissions.js";
import { DEFAULT_TENANT_SLUG } from "@rewindom/shared";

import { seedUselessDemo } from "../../../modules/useless/server/seed-demo.js";
import { ENABLED_SERVER_MODULES } from "../src/enabled-modules.js";

async function main(): Promise<void> {
  const slug = process.argv[2]?.trim() || DEFAULT_TENANT_SLUG;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }
  if (tenant.status !== "active") {
    throw new Error(`Tenant is not active: ${slug}`);
  }

  const user = await prisma.user.findFirst({
    where: { tenant_id: tenant.id, enabled: true },
    orderBy: { created_at: "asc" },
  });
  if (!user) {
    throw new Error(`No user in tenant: ${slug}`);
  }

  const catalog = collectModulePermissions([...ENABLED_SERVER_MODULES]);
  await RoleService.ensureBuiltinTenantRoles(tenant.id, catalog);

  const result = await seedUselessDemo(tenant.id, user.id);
  console.log(
    `[seed-useless-demo] tenant=${slug} user=${user.username} enabled_useless=${result.enabled_module} lines=+${result.created} skipped=${result.skipped} backfilled=${result.backfilled}`,
  );
  console.log("[seed-useless-demo] workspace /app/things");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
