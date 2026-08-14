/**
 * 为指定站点铺商店 demo（商品 / 分类 / 优惠码 / 运费 / 示例订单），并开通 shop 模块。
 *
 * 幂等，可重复执行。不会覆盖已有 slug 上的编辑。
 *
 *   pnpm --filter server exec tsx scripts/seed-shop-demo.ts [tenantSlug]
 */
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { collectModulePermissions } from "@rewindom/server-kernel/runtime/collect-module-permissions.js";
import { DEFAULT_TENANT_SLUG } from "@rewindom/shared";

import { RoleService } from "@rewindom/builtin/rbac/server/role.service.js";
import { seedShopDemo } from "../../../modules/shop/server/seed-demo.js";

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

  const result = await seedShopDemo(tenant.id, user.id);
  console.log(
    `[seed-shop-demo] tenant=${slug} user=${user.username} enabled_shop=${result.enabled_shop} settings=${result.settings} collections=+${result.collections_created} products=+${result.products_created} discounts=+${result.discounts_created} shipping_zones=+${result.shipping_zones_created} orders=+${result.orders_created} nav_updated=${result.nav_updated}`,
  );
  console.log(
    "[seed-shop-demo] storefront /shop · workspace /app/shop · coupons WELCOME10 (10%) / SAVE15 ($15 off $50+)",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
