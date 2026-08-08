/**
 * 租户文档库的读写。
 *
 * 与 `site.service.ts`（页面版式系统）解耦：文档就是「标题 + Markdown 正文 + 分类」，
 * 不进 section / block 体系。每租户默认有 `/docs`（索引）与 `/docs/:slug`（详情）
 * 路由，渲染复用站点 chrome + `.prose` 排版（见 `ssr.routes.ts` 的 `renderDocLibrary`）。
 *
 * draft / live 语义与 `MarketingPage` 同口径：`_draft` 后缀是编辑器在改的那一份，
 * 无后缀是线上（访客看到的）。发布时把草稿复制到线上列，撤销时反向。
 */

import {
  type Prisma,
  type MarketingDoc as MarketingDocRecord,
} from "@be-water/server-kernel/generated/prisma/client/client.js";
import {
  ConflictError,
  NotFoundError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";
import { normalizeLocale, type AppLocale } from "@be-water/shared";

import {
  formatDocAsMarkdown,
  parseCreateDocBody,
  parseMarkdownFile,
  parseUpdateDocBody,
  validateDocSlug,
  type CreateMarketingDocBody,
  type MarketingDoc,
  type MarketingDocListItem,
  type MarketingDocStatus,
  type UpdateMarketingDocBody,
} from "../shared/marketing-doc.js";

function asStatus(value: string): MarketingDocStatus {
  return value === "published" ? "published" : "draft";
}

/** 草稿是否与线上一致（逐字段比对）。未发布的文档恒为 false（线上列是建页初值）。 */
function isContentDirty(record: MarketingDocRecord): boolean {
  if (record.status !== "published") return false;
  return (
    record.title !== record.title_draft ||
    record.description !== record.description_draft ||
    record.body_md !== record.body_md_draft ||
    record.category !== record.category_draft ||
    record.sort_order !== record.sort_order_draft
  );
}

export function toMarketingDoc(record: MarketingDocRecord): MarketingDoc {
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    slug: record.slug,
    locale: normalizeLocale(record.locale),
    title: record.title,
    description: record.description,
    body_md: record.body_md,
    category: record.category,
    sort_order: record.sort_order,
    status: asStatus(record.status),
    title_draft: record.title_draft,
    description_draft: record.description_draft,
    body_md_draft: record.body_md_draft,
    category_draft: record.category_draft,
    sort_order_draft: record.sort_order_draft,
    content_dirty: isContentDirty(record),
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

function toListItem(record: MarketingDocRecord): MarketingDocListItem {
  return {
    id: record.id,
    slug: record.slug,
    locale: normalizeLocale(record.locale),
    title: record.title_draft,
    description: record.description_draft,
    category: record.category_draft,
    status: asStatus(record.status),
    content_dirty: isContentDirty(record),
    sort_order: record.sort_order_draft,
    updated_at: record.updated_at.toISOString(),
  };
}

async function resolveDefaultLocale(tenant_id: string): Promise<AppLocale> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
    select: { default_locale: true },
  });
  return normalizeLocale(site?.default_locale);
}

export async function listDocs(
  tenant_id: string,
): Promise<MarketingDocListItem[]> {
  const records = await prisma.marketingDoc.findMany({
    where: withTenantScope(tenant_id),
    orderBy: [
      { category_draft: "asc" },
      { sort_order_draft: "asc" },
      { title_draft: "asc" },
    ],
  });
  return records.map(toListItem);
}

export async function getDoc(
  tenant_id: string,
  doc_id: string,
): Promise<MarketingDoc> {
  const record = await prisma.marketingDoc.findFirst({
    where: withTenantScope(tenant_id, { id: doc_id }),
  });
  if (!record) {
    throw new NotFoundError("site.doc_not_found");
  }
  return toMarketingDoc(record);
}

export async function createDoc(
  tenant_id: string,
  body: CreateMarketingDocBody,
): Promise<MarketingDoc> {
  const parsed = parseCreateDocBody(body);
  const locale = await resolveDefaultLocale(tenant_id);
  try {
    const created = await prisma.marketingDoc.create({
      data: {
        tenant_id,
        slug: parsed.slug,
        locale,
        title: parsed.title,
        description: parsed.description,
        body_md: parsed.body_md,
        category: parsed.category,
        sort_order: parsed.sort_order,
        status: "draft",
        title_draft: parsed.title,
        description_draft: parsed.description,
        body_md_draft: parsed.body_md,
        category_draft: parsed.category,
        sort_order_draft: parsed.sort_order,
      },
    });
    return toMarketingDoc(created);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new ConflictError("site.doc_slug_conflict");
    }
    throw err;
  }
}

export async function updateDoc(
  tenant_id: string,
  doc_id: string,
  body: UpdateMarketingDocBody,
): Promise<MarketingDoc> {
  const existing = await prisma.marketingDoc.findFirst({
    where: withTenantScope(tenant_id, { id: doc_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.doc_not_found");
  }
  const parsed = parseUpdateDocBody(body);
  const data: Prisma.MarketingDocUpdateInput = {};
  if (parsed.slug !== undefined && parsed.slug !== existing.slug) {
    data.slug = parsed.slug;
  }
  if (parsed.title !== undefined) data.title_draft = parsed.title;
  if (parsed.description !== undefined)
    data.description_draft = parsed.description;
  if (parsed.body_md !== undefined) data.body_md_draft = parsed.body_md;
  if (parsed.category !== undefined) data.category_draft = parsed.category;
  if (parsed.sort_order !== undefined)
    data.sort_order_draft = parsed.sort_order;

  try {
    const updated = await prisma.marketingDoc.update({
      where: { id: doc_id, tenant_id },
      data,
    });
    return toMarketingDoc(updated);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new ConflictError("site.doc_slug_conflict");
    }
    throw err;
  }
}

export async function deleteDoc(
  tenant_id: string,
  doc_id: string,
): Promise<void> {
  const existing = await prisma.marketingDoc.findFirst({
    where: withTenantScope(tenant_id, { id: doc_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.doc_not_found");
  }
  await prisma.marketingDoc.delete({ where: { id: doc_id, tenant_id } });
}

/** 发布：把草稿列复制到线上列，并置 status=published。 */
export async function publishDoc(
  tenant_id: string,
  doc_id: string,
): Promise<MarketingDoc> {
  const existing = await prisma.marketingDoc.findFirst({
    where: withTenantScope(tenant_id, { id: doc_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.doc_not_found");
  }
  const updated = await prisma.marketingDoc.update({
    where: { id: doc_id, tenant_id },
    data: {
      status: "published",
      title: existing.title_draft,
      description: existing.description_draft,
      body_md: existing.body_md_draft,
      category: existing.category_draft,
      sort_order: existing.sort_order_draft,
    },
  });
  return toMarketingDoc(updated);
}

/** 取消发布：文档对访客不可见（不出现在 /docs）。正文不动，只是 status 退回 draft。 */
export async function unpublishDoc(
  tenant_id: string,
  doc_id: string,
): Promise<MarketingDoc> {
  const existing = await prisma.marketingDoc.findFirst({
    where: withTenantScope(tenant_id, { id: doc_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.doc_not_found");
  }
  const updated = await prisma.marketingDoc.update({
    where: { id: doc_id, tenant_id },
    data: { status: "draft" },
  });
  return toMarketingDoc(updated);
}

/** 撤销未发布的更改：把线上列回灌进草稿列。未发布的文档无操作（线上列是初值）。 */
export async function revertDoc(
  tenant_id: string,
  doc_id: string,
): Promise<MarketingDoc> {
  const existing = await prisma.marketingDoc.findFirst({
    where: withTenantScope(tenant_id, { id: doc_id }),
  });
  if (!existing) {
    throw new NotFoundError("site.doc_not_found");
  }
  const updated = await prisma.marketingDoc.update({
    where: { id: doc_id, tenant_id },
    data:
      existing.status === "published"
        ? {
            title_draft: existing.title,
            description_draft: existing.description,
            body_md_draft: existing.body_md,
            category_draft: existing.category,
            sort_order_draft: existing.sort_order,
          }
        : {},
  });
  return toMarketingDoc(updated);
}

/**
 * 导入 `.md` 文件：每篇一个文件，文件名即 slug，frontmatter 提供标题 / 描述 / 分类。
 *
 * 同 slug 已存在时**覆盖草稿**（upsert 到草稿列）——导入的目的就是更新内容，
 * 撞唯一键直接报错只会让人不知道该改哪条。已发布文档导入后需要再点一次发布才上线。
 */
export interface ImportedDoc {
  slug: string;
  title: string;
  created: boolean;
}

export async function importDocFile(
  tenant_id: string,
  filename: string,
  raw: string,
): Promise<ImportedDoc> {
  const parsed = parseMarkdownFile(filename, raw);
  const locale = await resolveDefaultLocale(tenant_id);
  const existing = await prisma.marketingDoc.findFirst({
    where: withTenantScope(tenant_id, { slug: parsed.slug, locale }),
  });
  if (existing) {
    const updated = await prisma.marketingDoc.update({
      where: { id: existing.id, tenant_id },
      data: {
        title_draft: parsed.title,
        description_draft: parsed.description,
        body_md_draft: parsed.body_md,
        category_draft: parsed.category,
      },
    });
    return { slug: updated.slug, title: updated.title_draft, created: false };
  }
  try {
    const created = await prisma.marketingDoc.create({
      data: {
        tenant_id,
        slug: parsed.slug,
        locale,
        title: parsed.title,
        description: parsed.description,
        body_md: parsed.body_md,
        category: parsed.category,
        sort_order: 0,
        status: "draft",
        title_draft: parsed.title,
        description_draft: parsed.description,
        body_md_draft: parsed.body_md,
        category_draft: parsed.category,
        sort_order_draft: 0,
      },
    });
    return { slug: created.slug, title: created.title_draft, created: true };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new ConflictError("site.doc_slug_conflict");
    }
    throw err;
  }
}

/** 导出单篇文档为带 frontmatter 的 `.md` 文本（草稿内容，与编辑器一致）。 */
export async function getDocForExport(
  tenant_id: string,
  doc_id: string,
): Promise<{ filename: string; markdown: string; title: string }> {
  const doc = await getDoc(tenant_id, doc_id);
  return {
    filename: `${doc.slug}.md`,
    title: doc.title_draft,
    markdown: formatDocAsMarkdown({
      slug: doc.slug,
      title: doc.title_draft,
      description: doc.description_draft,
      category: doc.category_draft,
      body_md: doc.body_md_draft,
    }),
  };
}

/** 导出全部文档（草稿内容），供批量下载。 */
export async function getAllDocsForExport(
  tenant_id: string,
): Promise<Array<{ filename: string; markdown: string; title: string }>> {
  const records = await prisma.marketingDoc.findMany({
    where: withTenantScope(tenant_id),
    orderBy: [{ category_draft: "asc" }, { sort_order_draft: "asc" }],
  });
  return records.map((record) => ({
    filename: `${record.slug}.md`,
    title: record.title_draft,
    markdown: formatDocAsMarkdown({
      slug: record.slug,
      title: record.title_draft,
      description: record.description_draft,
      category: record.category_draft,
      body_md: record.body_md_draft,
    }),
  }));
}

/* ------------------------------------------------------------ 公开读路径 */

export interface PublicMarketingDoc {
  slug: string;
  title: string;
  description: string;
  body_md: string;
  category: string;
  sort_order: number;
  updated_at: string;
}

function toPublicDoc(record: MarketingDocRecord): PublicMarketingDoc {
  return {
    slug: record.slug,
    title: record.title,
    description: record.description,
    body_md: record.body_md,
    category: record.category,
    sort_order: record.sort_order,
    updated_at: record.updated_at.toISOString(),
  };
}

/**
 * 公开文档列表（已发布 + 当前语言）。
 *
 * 与页面的 `effectiveLocale` 不同：文档库 v1 只编辑站点主语言，非主语言**整库回落**
 * 主语言——请求语言一篇都没有时，不 404 而是展示主语言内容。有该语言的文档时则按
 * 该语言展示。
 */
export async function listPublishedDocs(
  tenant_id: string,
  locale: AppLocale | null,
): Promise<{
  docs: PublicMarketingDoc[];
  locale: AppLocale;
}> {
  const default_locale = await resolveDefaultLocale(tenant_id);
  const current = locale ?? default_locale;
  const records = await prisma.marketingDoc.findMany({
    where: withTenantScope(tenant_id, { status: "published" }),
    orderBy: [{ category: "asc" }, { sort_order: "asc" }, { title: "asc" }],
  });
  const inLocale = records.filter(
    (record) => normalizeLocale(record.locale, default_locale) === current,
  );
  // 当前语言有内容就用它；没有则整库回落主语言
  const effective =
    inLocale.length > 0
      ? inLocale
      : records.filter(
          (record) =>
            normalizeLocale(record.locale, default_locale) === default_locale,
        );
  return {
    docs: effective.map(toPublicDoc),
    locale: inLocale.length > 0 ? current : default_locale,
  };
}

/** 公开单篇文档（已发布 + 当前语言，回落主语言）。 */
export async function getPublishedDoc(
  tenant_id: string,
  slug: string,
  locale: AppLocale | null,
): Promise<{ doc: PublicMarketingDoc; locale: AppLocale } | null> {
  const default_locale = await resolveDefaultLocale(tenant_id);
  const current = locale ?? default_locale;
  const records = await prisma.marketingDoc.findMany({
    where: withTenantScope(tenant_id, { status: "published", slug }),
  });
  if (records.length === 0) return null;
  const inLocale = records.find(
    (record) => normalizeLocale(record.locale, default_locale) === current,
  );
  const fallback = records.find(
    (record) =>
      normalizeLocale(record.locale, default_locale) === default_locale,
  );
  const match = inLocale ?? fallback;
  if (!match) return null;
  return {
    doc: toPublicDoc(match),
    locale: inLocale ? current : default_locale,
  };
}

export { validateDocSlug };
