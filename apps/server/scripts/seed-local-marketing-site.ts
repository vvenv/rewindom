/**
 * 为指定租户铺一套已发布的默认 starter 营销站（home / docs / pricing）+ 使用说明文档库。
 *
 * 幂等：反复执行会覆盖 starter 内容与文档草稿并重新发布。
 *
 *   pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts [tenantSlug]
 *
 * 默认 slug：`default`（产品主域隐式绑定的组织）。
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_SLUG } from "@be-water/shared";

import {
  applySiteStarter,
  setPageStatus,
  updateSite,
} from "../../../packages/builtin/marketing/server/site.service.js";
import { seedDocsFromFiles } from "../../../packages/builtin/marketing/server/marketing-doc.service.js";

const USAGE_DOCS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../packages/builtin/marketing/docs/usage",
);

/**
 * 扫描 docs/usage/*.md（按文件名排序，保证 sort_order 稳定）。
 *
 * 这些是「本系统使用说明」的真源——代码版本化的 markdown，seed 时导入默认租户的
 * 文档库（MarketingDoc 表）。租户可在 DB 上覆盖编辑，下次 seed 会被覆盖回真源。
 */
function loadUsageDocs(): Array<{ filename: string; raw: string }> {
  return readdirSync(USAGE_DOCS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort()
    .map((file) => ({
      filename: file,
      raw: readFileSync(path.join(USAGE_DOCS_DIR, file), "utf8"),
    }));
}

async function main(): Promise<void> {
  const slug = process.argv[2]?.trim() || DEFAULT_TENANT_SLUG;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }
  if (tenant.status !== "active") {
    throw new Error(`Tenant is not active: ${slug}`);
  }

  const applied = await applySiteStarter(tenant.id, "default");
  await updateSite(tenant.id, { published: true });

  for (const page of applied.pages) {
    if (page.status !== "published") {
      await setPageStatus(tenant.id, page.id, "published");
    }
  }

  // 初始化默认租户的使用说明文档库（docs/usage/*.md → MarketingDoc 表，直接发布）
  const docs = loadUsageDocs();
  if (docs.length > 0) {
    const seeded = await seedDocsFromFiles(tenant.id, docs);
    const created = seeded.filter((r) => r.created).length;
    console.log(
      `[seed-local-marketing-site] seeded ${seeded.length} docs (created=${created}) for tenant=${slug}`,
    );
  } else {
    console.warn(
      `[seed-local-marketing-site] no usage docs found at ${USAGE_DOCS_DIR}`,
    );
  }

  console.log(
    `[seed-local-marketing-site] published default starter for tenant=${slug} pages=${applied.pages.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
