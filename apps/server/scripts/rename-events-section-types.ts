/* eslint-disable no-console */
/**
 * 段 type 改名：`events.entity_strip` → `events.entity-strip`，
 * `events.entity_index` → `events.entity-index`。
 *
 * 全系统的段 type 是 kebab（`shop.collection-list`、`site-member.login-form`、
 * `events.entity-hero`），这两段是 events 里最先写的，留了下划线。这串字符**存在库里**，
 * 所以改名要配一次性迁移——本仓库不给旧 type 留别名，存量数据由这类脚本接住。
 *
 * 三处存量，都要走一遍：
 *
 * - `MarketingPage.sections`（线上）与 `sections_draft`（编辑器在改的那一份）；
 * - `MarketingPageVersion.sections`——发布历史。不改的话「回滚到某个版本」会把旧 type
 *   写回页面上，改名就白做了；
 * - 容器段的列（`blocks[].sections[]`）：胶囊条摆在分栏里是合法版式，要递归进去。
 *
 * 顺手复活 `unsupported` 占位：部署与本脚本之间那段时间，读路径会把认不出的 type 原样
 * 兜进 `{ type: "unsupported", source: { type, raw } }`（见 `section-schema` 的口径），
 * 租户这时保存就把占位存进了库。按 `source.type` 认出来、拿 `source.raw` 还原成新 type，
 * 比让租户自己回编辑器重加一遍强。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/rename-events-section-types.ts --dry-run
 *   pnpm --filter server exec tsx scripts/rename-events-section-types.ts
 *   pnpm --filter server exec tsx scripts/rename-events-section-types.ts --tenant <slug>
 */

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

/** 旧 type → 新 type。新值就是代码里的常量，改完这里没有第二处真源。 */
const RENAMES: Readonly<Record<string, string>> = {
  "events.entity_strip": "events.entity-strip",
  "events.entity_index": "events.entity-index",
};

const UNSUPPORTED = "unsupported";

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * 一段：改名 / 复活占位 / 递归进列。返回 null 表示这一段原样不动。
 */
function renameSection(section: unknown): Row | null {
  if (!isRow(section)) return null;

  if (typeof section.type === "string" && RENAMES[section.type]) {
    return { ...section, type: RENAMES[section.type] };
  }

  // 占位里兜着的原始条目：`{ type: "unsupported", source: { type, raw } }`
  if (section.type === UNSUPPORTED && isRow(section.source)) {
    const source = section.source;
    const renamed =
      typeof source.type === "string" ? RENAMES[source.type] : undefined;
    if (renamed && isRow(source.raw)) {
      return { ...source.raw, type: renamed };
    }
    return null;
  }

  // 容器段的列：列本身不是段，段在 `block.sections` 里
  if (!Array.isArray(section.blocks)) return null;
  let changed = false;
  const blocks = section.blocks.map((block: unknown) => {
    if (!isRow(block) || !Array.isArray(block.sections)) return block;
    const nested = renameSections(block.sections);
    if (!nested) return block;
    changed = true;
    return { ...block, sections: nested };
  });
  return changed ? { ...section, blocks } : null;
}

/** 一串段；返回 null 表示整串原样不动。 */
function renameSections(sections: unknown): Row[] | null {
  if (!Array.isArray(sections)) return null;
  let changed = false;
  const next = sections.map((section: unknown) => {
    const renamed = renameSection(section);
    if (!renamed) return section as Row;
    changed = true;
    return renamed;
  });
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
    console.error(`[rename-events-section-types] 找不到租户 ${tenantSlug}`);
    process.exitCode = 1;
    return;
  }
  const scope = tenantId ? { tenant_id: tenantId } : {};

  console.log(`[rename-events-section-types] dry_run=${dryRun}`);

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
    const sections = renameSections(page.sections);
    const draft = renameSections(page.sections_draft);
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
    const sections = renameSections(version.sections);
    if (!sections) continue;
    versions += 1;
    if (dryRun) continue;
    await prisma.marketingPageVersion.update({
      where: { id: version.id },
      data: { sections },
    });
  }

  console.log(
    `[rename-events-section-types] ${dryRun ? "会改" : "已改"} ${pages} 张页面、${versions} 条发布历史`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
