/**
 * 默认租户文档库：从 `docs/usage/<locale>/*.md` 导入。
 *
 * 幂等**按语言算**：某个语言已有已发布文档就跳过那一份，避免覆盖后续编辑；
 * 后续补一门新语言时，老语言不受影响。
 */

import { prisma } from "@rewindom/module-sdk/server";
import { DEFAULT_TENANT_ID } from "@rewindom/module-sdk/server";

import { loadUsageDocs } from "./load-usage-docs.js";
import { seedDocsFromFiles } from "./site-doc.service.js";

export async function ensureDefaultSiteDocs(): Promise<void> {
  const seeded = await prisma.siteDoc.findMany({
    where: { tenant_id: DEFAULT_TENANT_ID, status: "published" },
    select: { locale: true },
    distinct: ["locale"],
  });
  const seededLocales = new Set(seeded.map((doc) => doc.locale));

  const docs = loadUsageDocs().filter((doc) => !seededLocales.has(doc.locale));
  if (docs.length === 0) return;
  await seedDocsFromFiles(DEFAULT_TENANT_ID, docs);
}
