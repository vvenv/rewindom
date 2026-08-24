/* eslint-disable no-console */
/**
 * 回填 `NewsEvent.source_kinds`（以及顺带对齐 `source_names`）。
 *
 * 加这两列时没有回填，而 `refreshEvents` 只碰热窗内与降温扫描捞到的事件——
 * 凉透的老事件再也不会被重算，于是它们的 `source_kinds` 永远是 NULL。
 * 本地库量的：3132 个事件里 **966 个（31%）是 NULL**，最早的一条在 2026-05-28。
 *
 * 后果不是显示问题，是**筛选静默失效**：Postgres 的 `&&` 对 NULL 返回 NULL，
 * 于是 Prisma 的 `hasSome` / `has` 对这些行恒不命中——
 *
 * - Rising 的「非新闻源不进」闸门（`source_kinds: { hasSome: CROSS_SOURCE_KINDS }`）
 *   把它们整批排除；
 * - 公开列表的 `?kind=release` 同样看不到它们。
 *
 * 两处都不会报错，只是少一批事件，所以线上很难被发现。
 *
 * 脚本**只回填这两列**，不重算热度、阶段、摘要与时间线——那是 `refreshEvents`
 * 的活，一次性脚本不越界（重算会顺带调分析器，那是一笔没人批准的模型费）。
 *
 * 幂等：按现存信号重新算出去重后的值再写回，重跑得到同样的结果。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/backfill-events-source-kinds.ts --dry-run
 *   pnpm --filter server exec tsx scripts/backfill-events-source-kinds.ts
 *   pnpm --filter server exec tsx scripts/backfill-events-source-kinds.ts --tenant <slug>
 */

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

/** 一批多少个事件。批太大时那一条 IN 查询会把信号表整片扫回来。 */
const BATCH_SIZE = 500;

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const tenantArg = process.argv.indexOf("--tenant");
  const tenantSlug = tenantArg >= 0 ? process.argv[tenantArg + 1] : undefined;

  const tenantId = tenantSlug
    ? (
        await prisma.tenant.findFirst({
          where: { slug: tenantSlug },
          select: { id: true },
        })
      )?.id
    : undefined;
  if (tenantSlug && !tenantId) {
    console.error(`[backfill-events-source-kinds] 找不到租户 ${tenantSlug}`);
    process.exitCode = 1;
    return;
  }
  const scope = tenantId ? { tenant_id: tenantId } : {};

  console.log(`[backfill-events-source-kinds] dry_run=${dryRun}`);

  /*
   * NULL 的那些是目标。Prisma 的标量列表读出来是 `[]`（它不区分 NULL 与空数组），
   * 所以候选要用原生 SQL 按 `IS NULL` 挑——用 Prisma 的 `equals: []` 会把
   * 「真的一条信号都没有」的事件也捞进来，那批本来就该是空的。
   */
  const targets = await prisma.$queryRawUnsafe<{ id: string }[]>(
    tenantId
      ? `SELECT id FROM "NewsEvent" WHERE source_kinds IS NULL AND tenant_id = $1`
      : `SELECT id FROM "NewsEvent" WHERE source_kinds IS NULL`,
    ...(tenantId ? [tenantId] : []),
  );

  console.log(`[backfill-events-source-kinds] 待回填 ${targets.length} 个事件`);
  if (targets.length === 0 || dryRun) {
    return;
  }

  let done = 0;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const ids = targets.slice(i, i + BATCH_SIZE).map((row) => row.id);
    const signals = await prisma.eventSignal.findMany({
      // 移除过的信号不参与任何聚合——与 refreshEvents 逐字同一条口径
      where: { ...scope, event_id: { in: ids }, removed_at: null },
      select: { event_id: true, source_kind: true, source_name: true },
    });

    const kinds = new Map<string, Set<string>>();
    const names = new Map<string, Set<string>>();
    const bucket = (
      map: Map<string, Set<string>>,
      key: string,
    ): Set<string> => {
      let set = map.get(key);
      if (!set) {
        set = new Set();
        map.set(key, set);
      }
      return set;
    };
    for (const signal of signals) {
      if (!signal.event_id) continue;
      bucket(kinds, signal.event_id).add(signal.source_kind);
      bucket(names, signal.event_id).add(signal.source_name);
    }

    for (const id of ids) {
      await prisma.newsEvent.update({
        where: { id },
        data: {
          source_kinds: [...(kinds.get(id) ?? [])],
          source_names: [...(names.get(id) ?? [])],
        },
      });
      done += 1;
    }
    console.log(`[backfill-events-source-kinds] ${done}/${targets.length}`);
  }

  console.log(`[backfill-events-source-kinds] 已回填 ${done} 个事件`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
