/* eslint-disable no-console */
/**
 * 删掉 changelog 元数据误抽成的实体（GitHub @handle、commit SHA、孤立 PR 号）。
 *
 * 判定与 `isChangelogNoiseName` 同一条规则，函数体拷在这里是为了脚本能
 * 在没有新代码的环境下跑。
 *
 * 本地（有 tsx / 源码）：
 *   pnpm --filter server exec tsx scripts/drop-changelog-noise-entities.ts --dry-run
 *   pnpm --filter server exec tsx scripts/drop-changelog-noise-entities.ts
 *
 * 生产 app 镜像没有 tsx、也不挂源码，改走 postgres：
 *   docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
 *     psql -U rewindom -d rewindom -c \
 *     "DELETE FROM \"EventEntity\" WHERE name ~ '@' OR btrim(name, '[]() ') ~* '^[0-9a-f]{7,40}$' OR btrim(name) ~ '^#[0-9]{1,7}$' RETURNING name, slug;"
 */
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

function isChangelogNoiseName(name: string): boolean {
  const trimmed = name
    .trim()
    .replace(/^[^\p{L}\p{N}@#]+|[^\p{L}\p{N}]+$/gu, "");
  if (trimmed.length === 0 || trimmed === "@" || trimmed === "#") {
    return true;
  }
  if (trimmed.startsWith("@")) {
    return true;
  }
  if (/^#\d{1,7}$/u.test(trimmed)) {
    return true;
  }
  return /^[0-9a-f]{7,40}$/iu.test(trimmed);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const entities = await prisma.eventEntity.findMany({
    select: {
      id: true,
      tenant_id: true,
      name: true,
      kind: true,
      slug: true,
      _count: { select: { links: true, follows: true } },
    },
    orderBy: { created_at: "asc" },
  });
  const noise = entities.filter((row) => isChangelogNoiseName(row.name));

  console.log(
    `[drop-changelog-noise-entities] scanned=${entities.length} matched=${noise.length} dry_run=${dryRun}`,
  );
  for (const row of noise) {
    console.log(
      `  ${row.slug}  name=${JSON.stringify(row.name)} kind=${row.kind} links=${row._count.links} follows=${row._count.follows} tenant=${row.tenant_id}`,
    );
  }

  if (dryRun || noise.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.eventEntity.deleteMany({
    where: { id: { in: noise.map((row) => row.id) } },
  });
  console.log(`[drop-changelog-noise-entities] deleted=${result.count}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
