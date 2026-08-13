/**
 * 租户文档库的读写。
 *
 * 与 `site.service.ts`（页面版式系统）解耦：文档就是「标题 + Markdown 正文 + 分类」，
 * 不进 section / block 体系。**版式**归两张文档模板页（`doc_index` / `doc_article`），
 * 由 `doc-*` 段消费这里吐出来的数据，见 `marketing-doc.ssr.ts`。
 *
 * draft / live 语义与 `MarketingPage` 同口径：`_draft` 后缀是编辑器在改的那一份，
 * 无后缀是线上（访客看到的）。发布时把草稿复制到线上列，撤销时反向。
 */

import {
  type Prisma,
  type MarketingDoc as MarketingDocRecord,
} from "@rewindom/server-kernel/generated/prisma/client/client.js";
import {
  parseSortDir,
  resolveSortField,
  resolveSortOrder,
} from "@rewindom/server-kernel/http/list-sort.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";
import { APP_LOCALES, normalizeLocale, type AppLocale } from "@rewindom/shared";

import {
  DOCS_INDEX_PATH,
  docFilename,
  docPath,
  docsInLocale,
  formatDocAsMarkdown,
  parseCreateDocBody,
  parseDuplicateDocBody,
  parseMarkdownFile,
  parseUpdateDocBody,
  validateDocSlug,
  type CreateMarketingDocBody,
  type DuplicateMarketingDocBody,
  type MarketingDoc,
  type MarketingDocListItem,
  type MarketingDocListQuery,
  type MarketingDocListResult,
  type MarketingDocStatus,
  type PublicDocDetail,
  type PublicDocSummary,
  type UpdateMarketingDocBody,
} from "../shared/marketing-doc.js";
import { type PageLocaleAlternate } from "../shared/site-cms.js";
import { siteLocaleOrder, withSiteLocale } from "../shared/site-locale.js";

import {
  resolveDocCategoryKey,
  loadCategoryContext,
  resolveDocCategoryLabel,
  seedDefaultDocCategories,
} from "./marketing-doc-category.service.js";

const DOC_LIST_SORT_FIELDS = new Set([
  "title",
  "slug",
  "category",
  "locale",
  "status",
  "updated_at",
  "sort_order",
]);

/** API sort_by → Prisma 列（列表展示的是草稿列）。 */
const DOC_LIST_SORT_COLUMN: Record<string, keyof MarketingDocRecord> = {
  title: "title_draft",
  slug: "slug",
  category: "category_draft",
  locale: "locale",
  status: "status",
  updated_at: "updated_at",
  sort_order: "sort_order_draft",
};

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

function toListItem(
  record: MarketingDocRecord,
  categories: Parameters<typeof resolveDocCategoryLabel>[0],
  defaultLocale: AppLocale,
): MarketingDocListItem {
  const locale = normalizeLocale(record.locale);
  const category = record.category_draft;
  return {
    id: record.id,
    slug: record.slug,
    locale,
    title: record.title_draft,
    description: record.description_draft,
    category,
    category_label: resolveDocCategoryLabel(
      categories,
      category,
      locale,
      defaultLocale,
    ),
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

function buildDocListWhere(
  tenant_id: string,
  query: MarketingDocListQuery,
): Prisma.MarketingDocWhereInput {
  const and: Prisma.MarketingDocWhereInput[] = [];

  const q = query.q?.trim();
  if (q) {
    and.push({
      OR: [
        { title_draft: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { description_draft: { contains: q, mode: "insensitive" } },
        { category_draft: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (query.category) {
    and.push({ category_draft: query.category });
  }
  if (query.locale) {
    and.push({ locale: query.locale });
  }
  if (query.status === "published" || query.status === "draft") {
    and.push({ status: query.status });
  } else if (query.status === "dirty") {
    // content_dirty 是计算字段：先收窄到已发布，再在内存里比草稿/线上列
    and.push({ status: "published" });
  }

  // tenant_id 必须在 where 顶层：tenant-guard 不递归 AND/OR，嵌进去会误报 missing
  // 并靠注入补救——筛选条件虽仍生效，但日志被污染。
  return withTenantScope(
    tenant_id,
    and.length > 0 ? { AND: and } : {},
  );
}

function resolveDocListOrderBy(
  sortBy: string | undefined,
  sortDir: "asc" | "desc" | undefined,
): Prisma.MarketingDocOrderByWithRelationInput[] {
  const field = resolveSortField(sortBy, DOC_LIST_SORT_FIELDS, "sort_order");
  const dir = resolveSortOrder(
    parseSortDir(sortDir),
    field === "sort_order" ? "asc" : "desc",
  );
  const column = DOC_LIST_SORT_COLUMN[field] ?? "sort_order_draft";
  if (column === "sort_order_draft") {
    return [{ sort_order_draft: dir }, { title_draft: "asc" }];
  }
  return [{ [column]: dir } as Prisma.MarketingDocOrderByWithRelationInput];
}

function collectFacets(
  rows: Array<{ category_draft: string; locale: string }>,
  categories: Parameters<typeof resolveDocCategoryLabel>[0],
): {
  categories: string[];
  locales: AppLocale[];
} {
  const keys = new Set<string>();
  for (const row of rows) {
    if (row.category_draft) keys.add(row.category_draft);
  }
  const ordered = categories
    .map((category) => category.key)
    .filter((key) => keys.has(key));
  for (const key of keys) {
    if (!ordered.includes(key)) ordered.push(key);
  }
  const seen = new Set(rows.map((row) => row.locale));
  const locales = APP_LOCALES.map((locale) => locale.slug).filter((slug) =>
    seen.has(slug),
  );
  return { categories: ordered, locales };
}

export async function listDocs(
  tenant_id: string,
  query: MarketingDocListQuery = {},
): Promise<MarketingDocListResult> {
  const page = Math.max(1, query.page ?? 1);
  const page_size = Math.min(999, Math.max(1, query.page_size ?? 20));
  const where = buildDocListWhere(tenant_id, query);
  const orderBy = resolveDocListOrderBy(query.sort_by, query.sort_dir);
  const dirtyOnly = query.status === "dirty";
  const { categories, defaultLocale } = await loadCategoryContext(tenant_id);

  const [facetRows, total_all, matched] = await Promise.all([
    prisma.marketingDoc.findMany({
      where: withTenantScope(tenant_id),
      select: { category_draft: true, locale: true },
    }),
    prisma.marketingDoc.count({ where: withTenantScope(tenant_id) }),
    dirtyOnly
      ? prisma.marketingDoc.findMany({ where, orderBy })
      : Promise.all([
          prisma.marketingDoc.findMany({
            where,
            orderBy,
            skip: (page - 1) * page_size,
            take: page_size,
          }),
          prisma.marketingDoc.count({ where }),
        ]),
  ]);

  const { categories: categoryKeys, locales } = collectFacets(
    facetRows,
    categories,
  );

  if (dirtyOnly) {
    const dirty = (matched as MarketingDocRecord[])
      .filter(isContentDirty)
      .map((record) => toListItem(record, categories, defaultLocale));
    const total = dirty.length;
    const page_count = Math.max(1, Math.ceil(total / page_size) || 1);
    const safePage = Math.min(page, page_count);
    const start = (safePage - 1) * page_size;
    return {
      items: dirty.slice(start, start + page_size),
      page: safePage,
      page_size,
      total,
      page_count,
      total_all,
      categories: categoryKeys,
      category_catalog: categories,
      locales,
    };
  }

  const [records, total] = matched as [MarketingDocRecord[], number];
  const page_count = Math.max(1, Math.ceil(total / page_size) || 1);
  return {
    items: records.map((record) =>
      toListItem(record, categories, defaultLocale),
    ),
    page,
    page_size,
    total,
    page_count,
    total_all,
    categories: categoryKeys,
    category_catalog: categories,
    locales,
  };
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
  const locale = parsed.locale ?? (await resolveDefaultLocale(tenant_id));
  const category = parsed.category
    ? await resolveDocCategoryKey(tenant_id, parsed.category)
    : "";
  try {
    const created = await prisma.marketingDoc.create({
      data: {
        tenant_id,
        slug: parsed.slug,
        locale,
        title: parsed.title,
        description: parsed.description,
        body_md: parsed.body_md,
        category,
        sort_order: parsed.sort_order,
        status: "draft",
        title_draft: parsed.title,
        description_draft: parsed.description,
        body_md_draft: parsed.body_md,
        category_draft: category,
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
  if (parsed.category !== undefined) {
    data.category_draft = parsed.category
      ? await resolveDocCategoryKey(tenant_id, parsed.category)
      : "";
  }
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

/**
 * 复制文档到另一语言（或同语言——同语言会撞 `(slug, locale)` 唯一键）。
 *
 * slug 固定沿用源文档：翻译组的 key 就是 slug，改路径就不成组了。
 */
export async function duplicateDoc(
  tenant_id: string,
  doc_id: string,
  body: DuplicateMarketingDocBody,
): Promise<MarketingDoc> {
  const source = await prisma.marketingDoc.findFirst({
    where: withTenantScope(tenant_id, { id: doc_id }),
  });
  if (!source) {
    throw new NotFoundError("site.doc_not_found");
  }

  let parsed: { title: string; locale: AppLocale | null };
  try {
    parsed = parseDuplicateDocBody(body);
  } catch (err) {
    const code = err instanceof Error ? err.message : "site.doc_body_invalid";
    throw new ValidationError(code);
  }

  const defaultLocale = await resolveDefaultLocale(tenant_id);
  const sourceLocale = normalizeLocale(source.locale, defaultLocale);
  const locale = parsed.locale ?? sourceLocale;

  const clash = await prisma.marketingDoc.findFirst({
    where: withTenantScope(tenant_id, { slug: source.slug, locale }),
    select: { id: true },
  });
  if (clash) {
    throw new ConflictError("site.doc_slug_conflict");
  }

  try {
    const created = await prisma.marketingDoc.create({
      data: {
        tenant_id,
        slug: source.slug,
        locale,
        title: parsed.title,
        description: source.description_draft,
        body_md: source.body_md_draft,
        category: source.category_draft,
        sort_order: source.sort_order_draft,
        status: "draft",
        title_draft: parsed.title,
        description_draft: source.description_draft,
        body_md_draft: source.body_md_draft,
        category_draft: source.category_draft,
        sort_order_draft: source.sort_order_draft,
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
  locale: AppLocale;
  title: string;
  created: boolean;
}

export async function importDocFile(
  tenant_id: string,
  filename: string,
  raw: string,
): Promise<ImportedDoc> {
  const parsed = parseMarkdownFile(filename, raw);
  // 文件自己说了是哪种语言就按它来（`faq.en.md` 或 frontmatter 的 `locale`）
  const locale = parsed.locale ?? (await resolveDefaultLocale(tenant_id));
  const category = parsed.category
    ? await resolveDocCategoryKey(tenant_id, parsed.category)
    : "";
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
        category_draft: category,
        // 文件没写 sort_order 就别动既有排序（见 `ParsedMarkdownFile.sort_order`）
        ...(parsed.sort_order === null
          ? {}
          : { sort_order_draft: parsed.sort_order }),
      },
    });
    return {
      slug: updated.slug,
      locale,
      title: updated.title_draft,
      created: false,
    };
  }
  try {
    const sort_order = parsed.sort_order ?? 0;
    const created = await prisma.marketingDoc.create({
      data: {
        tenant_id,
        slug: parsed.slug,
        locale,
        title: parsed.title,
        description: parsed.description,
        body_md: parsed.body_md,
        category,
        sort_order,
        status: "draft",
        title_draft: parsed.title,
        description_draft: parsed.description,
        body_md_draft: parsed.body_md,
        category_draft: category,
        sort_order_draft: sort_order,
      },
    });
    return {
      slug: created.slug,
      locale,
      title: created.title_draft,
      created: true,
    };
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

/**
 * 从 `.md` 文件批量 seed 文档到租户：upsert 草稿 + 设排序 + 直接发布。
 *
 * 与 `importDocFile` 的区别：seed 自动发布并按 frontmatter 设 `sort_order`，用于初始化
 * 默认租户的使用说明文档。幂等——反复执行覆盖草稿并重新发布，已存在的文档不会重复创建。
 *
 * 文件名即 slug（去 `.md`），frontmatter 提供 title/description/category/sort_order。
 * 每份文件可自带 `locale`（一篇文档的各语言版本是**各自独立的行**，共用 slug）；
 * 不带时落在站点主语言上。
 */
export interface SeededDoc {
  slug: string;
  locale: AppLocale;
  title: string;
  created: boolean;
}

export async function seedDocsFromFiles(
  tenant_id: string,
  files: ReadonlyArray<{ filename: string; raw: string; locale?: AppLocale }>,
): Promise<SeededDoc[]> {
  const default_locale = await resolveDefaultLocale(tenant_id);
  await seedDefaultDocCategories(tenant_id);
  const results: SeededDoc[] = [];
  for (const file of files) {
    const parsed = parseMarkdownFile(file.filename, file.raw);
    const locale = file.locale ?? default_locale;
    const category = parsed.category
      ? await resolveDocCategoryKey(tenant_id, parsed.category)
      : "";
    // seed 的来源是仓库里排好序的一整套文档，缺省当 0（与导入不同：那里要保护租户的排序）
    const sort_order = parsed.sort_order ?? 0;
    const existing = await prisma.marketingDoc.findFirst({
      where: withTenantScope(tenant_id, { slug: parsed.slug, locale }),
    });
    let created: boolean;
    if (existing) {
      await prisma.marketingDoc.update({
        where: { id: existing.id, tenant_id },
        data: {
          status: "published",
          title: parsed.title,
          description: parsed.description,
          body_md: parsed.body_md,
          category,
          sort_order,
          title_draft: parsed.title,
          description_draft: parsed.description,
          body_md_draft: parsed.body_md,
          category_draft: category,
          sort_order_draft: sort_order,
        },
      });
      created = false;
    } else {
      try {
        await prisma.marketingDoc.create({
          data: {
            tenant_id,
            slug: parsed.slug,
            locale,
            title: parsed.title,
            description: parsed.description,
            body_md: parsed.body_md,
            category,
            sort_order,
            status: "published",
            title_draft: parsed.title,
            description_draft: parsed.description,
            body_md_draft: parsed.body_md,
            category_draft: category,
            sort_order_draft: sort_order,
          },
        });
        created = true;
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
    results.push({ slug: parsed.slug, locale, title: parsed.title, created });
  }
  return results;
}

/** 导出单篇文档为带 frontmatter 的 `.md` 文本（草稿内容，与编辑器一致）。 */
export async function getDocForExport(
  tenant_id: string,
  doc_id: string,
): Promise<{ filename: string; markdown: string; title: string }> {
  const doc = await getDoc(tenant_id, doc_id);
  const default_locale = await resolveDefaultLocale(tenant_id);
  return {
    filename: docFilename(doc.slug, doc.locale, default_locale),
    title: doc.title_draft,
    markdown: formatDocAsMarkdown({
      slug: doc.slug,
      locale: doc.locale,
      title: doc.title_draft,
      description: doc.description_draft,
      category: doc.category_draft,
      sort_order: doc.sort_order_draft,
      body_md: doc.body_md_draft,
    }),
  };
}

/** 导出全部文档（草稿内容），供批量下载。 */
export async function getAllDocsForExport(
  tenant_id: string,
): Promise<Array<{ filename: string; markdown: string; title: string }>> {
  const default_locale = await resolveDefaultLocale(tenant_id);
  const records = await prisma.marketingDoc.findMany({
    where: withTenantScope(tenant_id),
    orderBy: [{ category_draft: "asc" }, { sort_order_draft: "asc" }],
  });
  return records.map((record) => {
    const locale = normalizeLocale(record.locale, default_locale);
    return {
      filename: docFilename(record.slug, locale, default_locale),
      title: record.title_draft,
      markdown: formatDocAsMarkdown({
        slug: record.slug,
        locale,
        title: record.title_draft,
        description: record.description_draft,
        category: record.category_draft,
        sort_order: record.sort_order_draft,
        body_md: record.body_md_draft,
      }),
    };
  });
}

/* ------------------------------------------------------------ 公开读路径 */

/**
 * 摘要投影。
 *
 * 参数按**结构**收而不是收整条 `MarketingDocRecord`：目录查询已经用 `select` 只取
 * 这几列（不拉 `body_md`），要求完整记录就等于逼调用方把正文也查出来。
 */
function toDocSummary(
  record: {
    slug: string;
    title: string;
    description: string;
    category: string;
    sort_order: number;
    updated_at: Date;
  },
  categories: Parameters<typeof resolveDocCategoryLabel>[0],
  locale: AppLocale,
  defaultLocale: AppLocale,
): PublicDocSummary {
  return {
    slug: record.slug,
    title: record.title,
    description: record.description,
    category: record.category,
    category_label: resolveDocCategoryLabel(
      categories,
      record.category,
      locale,
      defaultLocale,
    ),
    sort_order: record.sort_order,
    updated_at: record.updated_at.toISOString(),
  };
}

function toDocDetail(
  record: MarketingDocRecord,
  categories: Parameters<typeof resolveDocCategoryLabel>[0],
  locale: AppLocale,
  defaultLocale: AppLocale,
): PublicDocDetail {
  return {
    ...toDocSummary(record, categories, locale, defaultLocale),
    body_md: record.body_md,
  };
}

/**
 * 同一篇文档（同 slug）的其它语言入口。
 *
 * 翻译组的 key 是 `slug`——`@@unique([tenant_id, slug, locale])` 已经保证同 slug 的
 * 不同语言行天然成组，不需要额外的关联列。
 */
export function buildDocAlternates(
  logicalPath: string,
  locales: readonly AppLocale[],
  defaultLocale: AppLocale,
): PageLocaleAlternate[] {
  const seen = new Set<AppLocale>();
  const out: PageLocaleAlternate[] = [];
  for (const locale of locales) {
    if (seen.has(locale)) continue;
    seen.add(locale);
    out.push({
      locale,
      path: withSiteLocale(logicalPath, locale, defaultLocale),
    });
  }
  return out;
}

function orderLocales(
  found: Iterable<AppLocale>,
  defaultLocale: AppLocale,
): AppLocale[] {
  const set = new Set(found);
  return siteLocaleOrder(defaultLocale).filter((locale) => set.has(locale));
}

/** 某 slug 已发布的语言列表（页头切换 / hreflang）。 */
export async function listPublishedDocLocales(
  tenant_id: string,
  slug: string,
): Promise<{ locales: AppLocale[]; defaultLocale: AppLocale }> {
  const defaultLocale = await resolveDefaultLocale(tenant_id);
  const records = await prisma.marketingDoc.findMany({
    where: withTenantScope(tenant_id, { status: "published", slug }),
    select: { locale: true },
  });
  const locales = orderLocales(
    records.map((record) => normalizeLocale(record.locale, defaultLocale)),
    defaultLocale,
  );
  return { locales, defaultLocale };
}

/** 文档库里至少有一篇已发布文档的语言（索引页切换器用）。 */
export async function listPublishedLibraryLocales(
  tenant_id: string,
): Promise<{ locales: AppLocale[]; defaultLocale: AppLocale }> {
  const defaultLocale = await resolveDefaultLocale(tenant_id);
  const records = await prisma.marketingDoc.findMany({
    where: withTenantScope(tenant_id, { status: "published" }),
    select: { locale: true },
  });
  const locales = orderLocales(
    records.map((record) => normalizeLocale(record.locale, defaultLocale)),
    defaultLocale,
  );
  return { locales, defaultLocale };
}

export interface DocSitemapEntry {
  path: string;
  updated_at: string;
  alternates: PageLocaleAlternate[];
}

/**
 * sitemap 文档条目：索引页 + 每篇文档，每种已发布语言各一条，并挂全组 hreflang。
 */
export async function getPublishedDocSitemapEntries(
  tenant_id: string,
): Promise<DocSitemapEntry[]> {
  const defaultLocale = await resolveDefaultLocale(tenant_id);
  const records = await prisma.marketingDoc.findMany({
    where: withTenantScope(tenant_id, { status: "published" }),
    select: {
      slug: true,
      locale: true,
      updated_at: true,
    },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
  });
  if (records.length === 0) return [];

  const libraryLocales = new Set<AppLocale>();
  let indexUpdatedAt = records[0]!.updated_at;
  const bySlug = new Map<
    string,
    Array<{ locale: AppLocale; updated_at: Date }>
  >();
  const slugOrder: string[] = [];

  for (const record of records) {
    const locale = normalizeLocale(record.locale, defaultLocale);
    libraryLocales.add(locale);
    if (record.updated_at > indexUpdatedAt) indexUpdatedAt = record.updated_at;
    const existing = bySlug.get(record.slug);
    if (existing) {
      existing.push({ locale, updated_at: record.updated_at });
      continue;
    }
    bySlug.set(record.slug, [{ locale, updated_at: record.updated_at }]);
    slugOrder.push(record.slug);
  }

  const libraryAlternates = buildDocAlternates(
    DOCS_INDEX_PATH,
    orderLocales(libraryLocales, defaultLocale),
    defaultLocale,
  );
  const entries: DocSitemapEntry[] = libraryAlternates.map((alternate) => ({
    path: alternate.path,
    updated_at: indexUpdatedAt.toISOString(),
    alternates: libraryAlternates,
  }));

  for (const slug of slugOrder) {
    const rows = bySlug.get(slug) ?? [];
    const alternates = buildDocAlternates(
      docPath(slug),
      orderLocales(
        rows.map((row) => row.locale),
        defaultLocale,
      ),
      defaultLocale,
    );
    for (const row of rows) {
      entries.push({
        path: withSiteLocale(docPath(slug), row.locale, defaultLocale),
        updated_at: row.updated_at.toISOString(),
        alternates,
      });
    }
  }
  return entries;
}

/**
 * 公开文档列表（已发布 + 当前语言）。
 *
 * 与页面的 `effectiveLocale` 不同：文档库请求语言一篇都没有时，**整库回落**主语言——
 * 不 404 而是展示主语言内容。有该语言的文档时则按该语言展示。
 */
export async function listPublishedDocs(
  tenant_id: string,
  locale: AppLocale | null,
): Promise<{
  docs: PublicDocSummary[];
  locale: AppLocale;
}> {
  const default_locale = await resolveDefaultLocale(tenant_id);
  const current = locale ?? default_locale;
  const { categories } = await loadCategoryContext(tenant_id);
  const records = await prisma.marketingDoc.findMany({
    where: withTenantScope(tenant_id, { status: "published" }),
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    /*
     * 显式列字段：不带 `select` 的 `findMany` 会把 `body_md` 也从库里拉出来，
     * 再由 `toDocSummary` 丢掉——几百篇文档就是几 MB 白跑一趟网络与内存。
     * 页头的文档入口让这条查询跑在很多页面上，这个浪费不能留。
     */
    select: {
      slug: true,
      title: true,
      description: true,
      category: true,
      sort_order: true,
      updated_at: true,
      locale: true,
    },
  });
  // 当前语言有内容就用它；没有则整库回落主语言（口径与编辑器预览共用同一函数）
  const effective = docsInLocale(records, current, default_locale);
  return {
    // 列表不带正文：几百篇文档的 `body_md` 是几 MB 的无用 payload
    docs: effective.docs.map((record) =>
      toDocSummary(record, categories, effective.locale, default_locale),
    ),
    locale: effective.locale,
  };
}

/** 公开单篇文档（已发布 + 当前语言，回落主语言）。 */
export async function getPublishedDoc(
  tenant_id: string,
  slug: string,
  locale: AppLocale | null,
): Promise<{ doc: PublicDocDetail; locale: AppLocale } | null> {
  const default_locale = await resolveDefaultLocale(tenant_id);
  const current = locale ?? default_locale;
  const { categories } = await loadCategoryContext(tenant_id);
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
  const effectiveLocale = inLocale ? current : default_locale;
  return {
    doc: toDocDetail(match, categories, effectiveLocale, default_locale),
    locale: effectiveLocale,
  };
}

export { validateDocSlug };

/**
 * 站里有没有已发布文档。
 *
 * 页头的搜索入口只要这一个布尔值——为它拉一遍全库目录（默认开，等于每个页面都拉）
 * 纯属浪费。`findFirst` 命中第一行就停，比 `count` 还省。
 */
export async function hasPublishedDocs(tenant_id: string): Promise<boolean> {
  const found = await prisma.marketingDoc.findFirst({
    where: withTenantScope(tenant_id, { status: "published" }),
    select: { id: true },
  });
  return found !== null;
}
