/* eslint-disable no-console */
/**
 * 从 CMS 页面里摘掉 `events.briefing`。
 *
 * 简报没有自己的排序尺子，只是把 Now 里的厚卡提前拿走——厚卡对比应该留在
 * Rising / Now 网格里。代码不再登记这段；库里的存量由本脚本一次性删掉。
 *
 * 三处都要走：已发布 `sections`、草稿 `sections_draft`、发布历史
 * `MarketingPageVersion.sections`。分栏列里的嵌套段也递归。
 *
 * 部署与本脚本之间那段时间，读路径会把认不出的 type 兜进 `unsupported` 占位；
 * 按 `source.type` 认出来一并摘掉，避免编辑器里留一块「不支持的区块」。
 *
 * 用法（本地有 tsx）：
 *   pnpm --filter server exec tsx scripts/drop-events-briefing-sections.ts --dry-run
 *   pnpm --filter server exec tsx scripts/drop-events-briefing-sections.ts
 *   pnpm --filter server exec tsx scripts/drop-events-briefing-sections.ts --tenant <slug>
 *
 * 生产镜像没有 tsx，用同目录 drop-events-briefing-sections.sql 进 postgres。
 */

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

const DROP_TYPE = "events.briefing";
const UNSUPPORTED = "unsupported";

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shouldDrop(section: Row): boolean {
  if (section.type === DROP_TYPE) return true;
  if (section.type === UNSUPPORTED && isRow(section.source)) {
    return section.source.type === DROP_TYPE;
  }
  return false;
}

function stripSection(section: unknown): Row | "drop" | null {
  if (!isRow(section)) return null;
  if (shouldDrop(section)) return "drop";
  if (!Array.isArray(section.blocks)) return null;

  let changed = false;
  const blocks = section.blocks.map((block: unknown) => {
    if (!isRow(block) || !Array.isArray(block.sections)) return block;
    const nested = stripSections(block.sections);
    if (!nested) return block;
    changed = true;
    return { ...block, sections: nested };
  });
  return changed ? { ...section, blocks } : null;
}

/** 一串段；返回 null 表示整串原样不动。 */
function stripSections(sections: unknown): Row[] | null {
  if (!Array.isArray(sections)) return null;
  let changed = false;
  const next: Row[] = [];
  for (const section of sections) {
    const stripped = stripSection(section);
    if (stripped === "drop") {
      changed = true;
      continue;
    }
    if (stripped) {
      changed = true;
      next.push(stripped);
      continue;
    }
    next.push(section as Row);
  }
  return changed ? next : null;
}

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
    console.error(`[drop-events-briefing-sections] 找不到站点 ${tenantSlug}`);
    process.exitCode = 1;
    return;
  }
  const scope = tenantId ? { tenant_id: tenantId } : {};

  console.log(`[drop-events-briefing-sections] dry_run=${dryRun}`);

  let pages = 0;
  for (const page of await prisma.marketingPage.findMany({
    where: scope,
    select: {
      id: true,
      tenant_id: true,
      slug: true,
      locale: true,
      sections: true,
      sections_draft: true,
    },
  })) {
    const sections = stripSections(page.sections);
    const draft = stripSections(page.sections_draft);
    if (!sections && !draft) continue;
    pages += 1;
    console.log(
      `  page ${page.tenant_id} ${page.slug} ${page.locale} ← ${[
        sections ? "sections" : "",
        draft ? "sections_draft" : "",
      ]
        .filter(Boolean)
        .join(" / ")}`,
    );
    if (dryRun) continue;
    await prisma.marketingPage.update({
      where: { id: page.id },
      data: {
        ...(sections ? { sections } : {}),
        ...(draft ? { sections_draft: draft } : {}),
      },
    });
  }

  let versions = 0;
  for (const version of await prisma.marketingPageVersion.findMany({
    where: scope,
    select: { id: true, page_id: true, version: true, sections: true },
  })) {
    const sections = stripSections(version.sections);
    if (!sections) continue;
    versions += 1;
    if (dryRun) continue;
    await prisma.marketingPageVersion.update({
      where: { id: version.id },
      data: { sections },
    });
  }

  console.log(
    `[drop-events-briefing-sections] ${dryRun ? "会改" : "已改"} ${pages} 张页面、${versions} 条发布历史`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
