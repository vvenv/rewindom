/* eslint-disable no-console */
/**
 * 把「旧默认 true、现改为 false」的 tenant_modules key 写成显式 true。
 *
 * 只补**缺失**的 key，不覆盖已经写下的 true / false。
 * 这样改注册表默认值不会让存量站点丢掉会员 / 表单 / 文档库 / 事件雷达等。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/backfill-tenant-module-legacy-defaults.ts --dry-run
 *   pnpm --filter server exec tsx scripts/backfill-tenant-module-legacy-defaults.ts
 */
import { TENANT_MODULES_STORAGE_KEY } from "@rewindom/builtin/platform/shared/tenant-modules.js";
import { type Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

/**
 * 本次改默认之前为 `default_enabled: true` 的 entitlement key。
 * 必须与当时的 runtime key 一致（如 todo 模块 spec 写 `todos`，代码 key 是 `todo`）。
 */
const LEGACY_DEFAULT_ON = [
  "tenant-marketing",
  "mailer",
  "billing",
  "note",
  "todo",
  "bookmark",
  "contents",
  "events",
  "site-docs",
  "site-form",
  "site-member",
  "site-billing",
] as const;

function asFlags(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(value as Record<string, unknown>)) {
    if (typeof flag === "boolean") out[key] = flag;
  }
  return out;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const tenants = await prisma.tenant.findMany({
    where: { status: { notIn: ["suspended", "archived"] } },
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });

  let scanned = 0;
  let unchanged = 0;
  let updated = 0;
  const samples: Array<{ slug: string; added: string[] }> = [];

  for (const tenant of tenants) {
    scanned += 1;
    const row = await prisma.tenantSetting.findUnique({
      where: {
        tenant_id_key: {
          tenant_id: tenant.id,
          key: TENANT_MODULES_STORAGE_KEY,
        },
      },
      select: { value: true },
    });
    const current = asFlags(row?.value);
    const merged = { ...current };
    const added: string[] = [];
    for (const key of LEGACY_DEFAULT_ON) {
      if (typeof merged[key] !== "boolean") {
        merged[key] = true;
        added.push(key);
      }
    }
    if (added.length === 0) {
      unchanged += 1;
      continue;
    }
    updated += 1;
    if (samples.length < 10) {
      samples.push({ slug: tenant.slug, added });
    }
    if (dryRun) continue;

    const json = merged as unknown as Prisma.InputJsonValue;
    await prisma.tenantSetting.upsert({
      where: {
        tenant_id_key: {
          tenant_id: tenant.id,
          key: TENANT_MODULES_STORAGE_KEY,
        },
      },
      create: {
        tenant_id: tenant.id,
        key: TENANT_MODULES_STORAGE_KEY,
        value: json,
        secret: null,
      },
      update: { value: json },
    });
  }

  console.log(
    `[backfill-tenant-module-legacy-defaults] scanned=${scanned} updated=${updated} unchanged=${unchanged} dry_run=${dryRun}`,
  );
  if (samples.length > 0) {
    console.log("[backfill-tenant-module-legacy-defaults] sample:", samples);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
