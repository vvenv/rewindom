/* eslint-disable no-console */
/**
 * 停用所有非交互（kind=text）的 thing，并解开它们占着的日期。
 *
 * 只关 enabled 不够：`@@unique([tenant_id, published_on])` 仍占着那天，
 * 可交互物绑不上去，公开站那天就是空的。所以一并把 published_on 清掉，
 * 再把腾出来的日子绑上还在池子里的 embed。
 *
 *   pnpm --filter server exec tsx scripts/disable-text-things.ts --dry-run
 *   pnpm --filter server exec tsx scripts/disable-text-things.ts
 *   pnpm --filter server exec tsx scripts/disable-text-things.ts 5yong
 */
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

import { localDateKey, parseDateKey } from "../../../modules/useless/server/thing.util.js";

async function bindEmbed(
  tenantId: string,
  published_on: Date,
): Promise<boolean> {
  const taken = await prisma.thing.findFirst({
    where: { tenant_id: tenantId, published_on },
    select: { id: true },
  });
  if (taken) return false;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Thing"
    WHERE "tenant_id" = ${tenantId}
      AND "kind" = 'embed'
      AND "enabled" = true
      AND "published_on" IS NULL
    ORDER BY random()
    LIMIT 1
  `;
  const candidate = rows[0];
  if (!candidate) return false;

  try {
    await prisma.thing.update({
      where: { id: candidate.id },
      data: { published_on },
    });
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const args = process.argv.slice(2).filter((arg) => arg !== "--dry-run");
  const slug = args[0]?.trim();

  const tenantFilter = slug
    ? await (async () => {
        const tenant = await prisma.tenant.findUnique({ where: { slug } });
        if (!tenant) throw new Error(`Tenant not found: ${slug}`);
        return { tenant_id: tenant.id };
      })()
    : {};

  const rows = await prisma.thing.findMany({
    where: { kind: "text", ...tenantFilter },
    select: {
      id: true,
      tenant_id: true,
      enabled: true,
      published_on: true,
      text: true,
    },
    orderBy: { created_at: "asc" },
  });

  const stillOn = rows.filter((row) => row.enabled || row.published_on);
  const freed = new Map<string, Date[]>();
  for (const row of stillOn) {
    if (!row.published_on) continue;
    const list = freed.get(row.tenant_id) ?? [];
    list.push(row.published_on);
    freed.set(row.tenant_id, list);
  }

  console.log(
    `[disable-text-things] scanned=${rows.length} to_disable=${stillOn.length} dates_to_rebind=${[...freed.values()].flat().length} dry_run=${dryRun}${slug ? ` tenant=${slug}` : ""}`,
  );
  for (const row of stillOn) {
    const preview = row.text.replace(/\s+/g, " ").slice(0, 40);
    const date = row.published_on?.toISOString().slice(0, 10) ?? "—";
    console.log(
      `  ${row.enabled ? "on" : "off"} date=${date} ${JSON.stringify(preview)}`,
    );
  }

  if (dryRun || stillOn.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const updated = await prisma.thing.updateMany({
    where: { id: { in: stillOn.map((row) => row.id) } },
    data: { enabled: false, published_on: null },
  });
  console.log(`[disable-text-things] disabled=${updated.count}`);

  let rebound = 0;
  for (const [tenantId, dates] of freed) {
    const today = parseDateKey(localDateKey(new Date()));
    const unique = new Map<string, Date>();
    for (const date of dates) unique.set(date.toISOString().slice(0, 10), date);
    if (today) unique.set(today.toISOString().slice(0, 10), today);
    for (const date of unique.values()) {
      if (await bindEmbed(tenantId, date)) rebound += 1;
    }
  }
  console.log(`[disable-text-things] rebound=${rebound}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
