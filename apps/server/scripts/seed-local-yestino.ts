/* eslint-disable no-console */
/**
 * 确保本地有独立的 **Yestino** 租户（slug=`yestino`），并套上品牌 / 关于页。
 *
 * 产品主域租户是 `rewindom`（`DEFAULT_TENANT_SLUG`），与 Yestino 分开：
 * - `http://localhost:7300` → Rewindom 产品站
 * - `http://yestino.localhost:7300` → Yestino（需 `TENANT_BASE_DOMAIN=localhost`）
 *
 * 若本地还只有旧 slug=`default` 的内容站，先：
 *   pnpm --filter server exec tsx scripts/clone-tenant.ts \
 *     --from default --to yestino --name Yestino
 * 再跑 `ensureDefaultTenant` / 本仓库启动路径，把主域租户 slug 升到 `rewindom`，
 * 然后 `seed-local-marketing-site.ts` 铺产品站。
 *
 *   pnpm --filter server exec tsx scripts/seed-local-yestino.ts --dry-run
 *   pnpm --filter server exec tsx scripts/seed-local-yestino.ts
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_SLUG } from "@rewindom/shared";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const YESTINO_SLUG = "yestino";
const YESTINO_NAME = "Yestino";

interface Args {
  dryRun: boolean;
  skipBrand: boolean;
  skipAbout: boolean;
}

function parseArgs(argv: string[]): Args {
  let dryRun = false;
  let skipBrand = false;
  let skipAbout = false;
  for (const token of argv) {
    if (token === "--dry-run") dryRun = true;
    else if (token === "--skip-brand") skipBrand = true;
    else if (token === "--skip-about") skipAbout = true;
    else if (token === "--help" || token === "-h") {
      console.log(
        "Usage: tsx scripts/seed-local-yestino.ts [--dry-run] [--skip-brand] [--skip-about]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return { dryRun, skipBrand, skipAbout };
}

function runSiblingScript(name: string, args: string[]): void {
  const scriptPath = join(SCRIPT_DIR, name);
  const result = spawnSync(
    "pnpm",
    ["--filter", "server", "exec", "tsx", scriptPath, ...args],
    {
      stdio: "inherit",
      env: process.env,
      cwd: join(SCRIPT_DIR, "../../.."),
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${name} exited with ${result.status ?? "null"}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  let tenant = await prisma.tenant.findUnique({
    where: { slug: YESTINO_SLUG },
    select: { id: true, slug: true, name: true, status: true },
  });

  if (!tenant) {
    const legacy = await prisma.tenant.findUnique({
      where: { slug: "default" },
      select: { slug: true },
    });
    if (legacy) {
      throw new Error(
        [
          "Tenant slug=yestino not found, but legacy slug=default still exists.",
          "Clone first, then rename the product tenant:",
          "  pnpm --filter server exec tsx scripts/clone-tenant.ts --from default --to yestino --name Yestino",
          "  pnpm --filter server exec tsx -e \"import { ensureDefaultTenant } from '@rewindom/builtin/platform/server/services/ensure-default-tenant.service.js'; await ensureDefaultTenant();\"",
          "  pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts",
        ].join("\n"),
      );
    }
    throw new Error(
      `Tenant slug=${YESTINO_SLUG} not found. Create it in the platform console or clone from ${DEFAULT_TENANT_SLUG}.`,
    );
  }

  if (tenant.status !== "active") {
    throw new Error(`Tenant ${YESTINO_SLUG} is not active`);
  }

  console.log(
    `[seed-local-yestino] tenant=${tenant.slug} name=${tenant.name} dry_run=${args.dryRun}`,
  );

  if (tenant.name !== YESTINO_NAME) {
    if (args.dryRun) {
      console.log(
        `[seed-local-yestino] would rename tenant.name ${tenant.name} → ${YESTINO_NAME}`,
      );
    } else {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { name: YESTINO_NAME },
      });
      console.log(`[seed-local-yestino] renamed tenant.name → ${YESTINO_NAME}`);
    }
  }

  const childArgs = ["--slug", YESTINO_SLUG];
  if (args.dryRun) childArgs.push("--dry-run");

  if (!args.skipBrand) {
    runSiblingScript("apply-yestino-brand.ts", childArgs);
  } else {
    console.log("[seed-local-yestino] skip brand");
  }

  if (!args.skipAbout) {
    runSiblingScript("apply-yestino-about.ts", childArgs);
  } else {
    console.log("[seed-local-yestino] skip about");
  }

  console.log(
    `[seed-local-yestino] done — open http://${YESTINO_SLUG}.localhost:7300 (TENANT_BASE_DOMAIN=localhost)`,
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
