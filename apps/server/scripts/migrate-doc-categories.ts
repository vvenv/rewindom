/**
 * 把存量文档库里的「分类显示名」迁成 canonical key，并补齐 MarketingDocCategory。
 *
 *   pnpm --filter server exec tsx scripts/migrate-doc-categories.ts [--dry-run]
 */

import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import { migrateLegacyDocCategories } from "../../../packages/builtin/marketing/server/marketing-doc-category.service.js";

const dryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  let totalCategories = 0;
  let totalDocs = 0;

  for (const tenant of tenants) {
    if (dryRun) {
      const docs = await prisma.marketingDoc.findMany({
        where: { tenant_id: tenant.id },
        select: { category: true, category_draft: true },
      });
      const values = new Set<string>();
      for (const doc of docs) {
        if (doc.category.trim()) values.add(doc.category.trim());
        if (doc.category_draft.trim()) values.add(doc.category_draft.trim());
      }
      console.log(
        `[dry-run] ${tenant.name} (${tenant.id}): ${values.size} unique category value(s), ${docs.length} doc row(s)`,
      );
      continue;
    }

    const result = await migrateLegacyDocCategories(tenant.id);
    totalCategories += result.categories;
    totalDocs += result.docs;
    if (result.categories > 0 || result.docs > 0) {
      console.log(
        `${tenant.name} (${tenant.id}): +${result.categories} categor(ies), ${result.docs} doc row(s) updated`,
      );
    }
  }

  if (!dryRun) {
    console.log(
      `Done. ${totalCategories} categor(ies) created, ${totalDocs} doc row(s) updated across ${tenants.length} tenant(s).`,
    );
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
