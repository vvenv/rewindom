import {
  ConflictError,
  NotFoundError,
  ValidationError,
  prisma,
  resolveSortField,
  resolveSortOrder,
  withTenantScope,
  type Prisma,
} from "@rewindom/module-sdk/server";

import { deleteStoredAssets } from "./content-asset.service.js";
import { generateContentFromSources } from "./content-generate.service.js";
import { toContent, toContentListItem } from "./content.mapper.js";
import {
  CONTENT_STALE_GENERATING_MS,
  parseContentFormat,
  validateContentInput,
} from "./content.util.js";

import {
  composeBriefText,
  contentTemplatePresets,
  normalizeBriefEntries,
  normalizeOutputRules,
  normalizeSamples,
  normalizeTemplateFields,
  validateBriefValues,
  type Content,
  type ContentFormat,
  type ContentListItem,
  type ContentTemplateField,
} from "../shared/index.js";

import type { AppLocale } from "@rewindom/module-sdk";
import type { GenerateContentTemplate } from "./content-generate.service.js";

export interface ListContentsParams {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  format?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface ListContentsResult {
  items: ContentListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

const CONTENT_SORTABLE_FIELDS = new Set([
  "title",
  "updated_at",
  "created_at",
  "status",
  "format",
]);

type ContentOrderBy =
  | { title: "asc" | "desc" }
  | { updated_at: "asc" | "desc" }
  | { created_at: "asc" | "desc" }
  | { status: "asc" | "desc" }
  | { format: "asc" | "desc" };

function buildContentOrderBy(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): ContentOrderBy {
  const field = resolveSortField(sortBy, CONTENT_SORTABLE_FIELDS, "updated_at");
  const order = resolveSortOrder(sortDir, "desc");
  return { [field]: order } as ContentOrderBy;
}

function buildContentListWhere(
  tenant_id: string,
  params: Pick<ListContentsParams, "q" | "format" | "status">,
): ReturnType<typeof withTenantScope> {
  return withTenantScope(tenant_id, {
    ...(params.format ? { format: params.format } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            {
              title: {
                contains: params.q.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              brief: {
                contains: params.q.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              body: { contains: params.q.trim(), mode: "insensitive" as const },
            },
          ],
        }
      : {}),
  });
}

/**
 * 没选模板时的兜底字段表 = 「通用创作说明」预设的那一个多行框。
 *
 * 让「无模板」也走同一条校验与存储路径：不然模块在租户建出第一个模板之前
 * 就得有第二套写法，而那套写法迟早会和模板这条漂开。
 */
function fallbackFields(locale: AppLocale): ContentTemplateField[] {
  const preset = contentTemplatePresets(locale).find(
    (item) => item.key === "general",
  );
  return preset?.fields ?? [];
}

/**
 * 按模板验收一次填写，返回落库要写的三样。
 *
 * 服务端只做「拦得住」这一层：逐字段的错误提示由前端按同一份 `validateBriefValues`
 * 渲染，这里报第一条就够——绕过表单构造请求的人不需要漂亮的表单反馈。
 */
async function resolveBrief(params: {
  tenant_id: string;
  locale: AppLocale;
  template_id?: string | null;
  brief_values?: Record<string, string>;
}): Promise<{
  template_id: string | null;
  brief_values: Prisma.InputJsonValue;
  brief: string;
}> {
  let fields = fallbackFields(params.locale);
  let template_id: string | null = null;

  if (params.template_id) {
    const template = await prisma.contentTemplate.findFirst({
      where: withTenantScope(params.tenant_id, { id: params.template_id }),
      select: { id: true, fields: true },
    });
    if (!template) {
      throw new NotFoundError("content.template.not_found");
    }
    fields = normalizeTemplateFields(template.fields);
    template_id = template.id;
  }

  const result = validateBriefValues(fields, params.brief_values ?? {});
  if (!result.ok) {
    const [fieldId, code] = Object.entries(result.errors)[0]!;
    const field = fields.find((item) => item.id === fieldId);
    throw new ValidationError(code, { field: field?.label ?? fieldId });
  }

  return {
    template_id,
    brief_values: result.entries as unknown as Prisma.InputJsonValue,
    brief: composeBriefText(result.entries),
  };
}

function throwIfInvalid(issue: ReturnType<typeof validateContentInput>): void {
  if (issue) {
    throw new ValidationError(issue.code, issue.params);
  }
}

async function loadContent(
  tenant_id: string,
  content_id: string,
): Promise<Content> {
  const record = await prisma.content.findFirst({
    where: withTenantScope(tenant_id, { id: content_id }),
    include: { assets: true },
  });
  if (!record) {
    throw new NotFoundError("content.not_found");
  }
  return toContent(record);
}

export async function listContents(
  params: ListContentsParams,
): Promise<ListContentsResult> {
  const { tenant_id, page, page_size, q, format, status, sort_by, sort_dir } =
    params;
  const skip = (page - 1) * page_size;
  const where = buildContentListWhere(tenant_id, { q, format, status });

  const [records, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: buildContentOrderBy(sort_by, sort_dir),
      skip,
      take: page_size,
      include: { _count: { select: { assets: true } } },
    }),
    prisma.content.count({ where }),
  ]);

  return {
    items: records.map(toContentListItem),
    page,
    page_size,
    total,
    page_count: Math.ceil(total / page_size) || 0,
  };
}

export async function getContent(
  tenant_id: string,
  content_id: string,
): Promise<Content> {
  return loadContent(tenant_id, content_id);
}

export async function createContent(params: {
  tenant_id: string;
  user_id: string;
  locale: AppLocale;
  title?: string;
  body?: string;
  format?: string;
  template_id?: string | null;
  brief_values?: Record<string, string>;
}): Promise<Content> {
  throwIfInvalid(
    validateContentInput({
      title: params.title,
      body: params.body,
      format: params.format,
    }),
  );
  const format = parseContentFormat(params.format) ?? "note";
  const brief = await resolveBrief(params);

  const record = await prisma.content.create({
    data: {
      tenant_id: params.tenant_id,
      title: params.title?.trim() ?? "",
      body: params.body?.trim() ?? "",
      template_id: brief.template_id,
      brief: brief.brief,
      brief_values: brief.brief_values,
      format,
      created_by: params.user_id,
    },
    include: { assets: true },
  });

  return toContent(record);
}

export async function updateContent(params: {
  tenant_id: string;
  user_id: string;
  locale: AppLocale;
  content_id: string;
  title?: string;
  body?: string;
  format?: string;
  template_id?: string | null;
  brief_values?: Record<string, string>;
}): Promise<Content> {
  throwIfInvalid(
    validateContentInput(
      {
        title: params.title,
        body: params.body,
        format: params.format,
      },
      { partial: true },
    ),
  );

  const existing = await prisma.content.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.content_id }),
    select: { id: true, status: true },
  });
  if (!existing) {
    throw new NotFoundError("content.not_found");
  }
  if (existing.status === "generating") {
    throw new ConflictError("content.generating");
  }

  const format: ContentFormat | undefined =
    params.format === undefined
      ? undefined
      : (parseContentFormat(params.format) ?? undefined);

  // 填写整体重算：模板可能换了，逐字段 patch 会留下上一个模板的孤儿 entry
  const brief =
    params.brief_values === undefined
      ? null
      : await resolveBrief({
          tenant_id: params.tenant_id,
          locale: params.locale,
          template_id: params.template_id,
          brief_values: params.brief_values,
        });

  await prisma.content.update({
    where: withTenantScope(params.tenant_id, { id: params.content_id }),
    data: {
      ...(params.title !== undefined ? { title: params.title.trim() } : {}),
      ...(params.body !== undefined ? { body: params.body.trim() } : {}),
      ...(format !== undefined ? { format } : {}),
      ...(brief
        ? {
            template_id: brief.template_id,
            brief: brief.brief,
            brief_values: brief.brief_values,
          }
        : {}),
      updated_by: params.user_id,
    },
  });

  return loadContent(params.tenant_id, params.content_id);
}

export async function deleteContent(
  tenant_id: string,
  content_id: string,
): Promise<void> {
  const existing = await prisma.content.findFirst({
    where: withTenantScope(tenant_id, { id: content_id }),
    include: { assets: { select: { storage_key: true } } },
  });
  if (!existing) {
    throw new NotFoundError("content.not_found");
  }
  if (existing.status === "generating") {
    throw new ConflictError("content.generating");
  }

  await deleteStoredAssets(existing.assets);
  await prisma.content.delete({
    where: withTenantScope(tenant_id, { id: content_id }),
  });
}

export async function enqueueContentGeneration(params: {
  tenant_id: string;
  user_id: string;
  content_id: string;
  logError: (payload: unknown, message: string) => void;
}): Promise<Content> {
  const existing = await prisma.content.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.content_id }),
    include: { assets: true },
  });
  if (!existing) {
    throw new NotFoundError("content.not_found");
  }
  if (existing.status === "generating") {
    throw new ConflictError("content.generating");
  }
  if (!existing.brief.trim() && existing.assets.length === 0) {
    throw new ValidationError("content.source_required");
  }

  const record = await prisma.content.update({
    where: withTenantScope(params.tenant_id, { id: params.content_id }),
    data: {
      status: "generating",
      error_message: null,
      updated_by: params.user_id,
    },
    include: { assets: true },
  });

  void runContentGeneration({
    tenant_id: params.tenant_id,
    content_id: params.content_id,
    logError: params.logError,
  });

  return toContent(record);
}

async function runContentGeneration(params: {
  tenant_id: string;
  content_id: string;
  logError: (payload: unknown, message: string) => void;
}): Promise<void> {
  try {
    const record = await prisma.content.findFirst({
      where: withTenantScope(params.tenant_id, { id: params.content_id }),
      include: { assets: true },
    });
    if (!record || record.status !== "generating") {
      return;
    }

    const generated = await generateContentFromSources(params.tenant_id, {
      format: record.format === "article" ? "article" : "note",
      entries: normalizeBriefEntries(record.brief_values),
      template: await loadGenerateTemplate(
        params.tenant_id,
        record.template_id,
      ),
      assets: record.assets.map((asset) => ({
        kind:
          asset.kind === "image" ||
          asset.kind === "video" ||
          asset.kind === "text"
            ? asset.kind
            : "text",
        filename: asset.filename,
        mime_type: asset.mime_type,
        text_body: asset.text_body,
        storage_key: asset.storage_key,
      })),
    });

    await prisma.content.updateMany({
      where: withTenantScope(params.tenant_id, {
        id: params.content_id,
        status: "generating",
      }),
      data: {
        title: generated.title,
        body: generated.body,
        tags: generated.tags,
        status: "ready",
        error_message: null,
      },
    });
  } catch (err) {
    const code =
      err instanceof Error && err.name === "LlmNotConfiguredError"
        ? "content.llm_not_configured"
        : "content.generate_failed";
    params.logError(
      { err, content_id: params.content_id },
      "content generation failed",
    );
    await prisma.content.updateMany({
      where: withTenantScope(params.tenant_id, {
        id: params.content_id,
        status: "generating",
      }),
      data: { status: "failed", error_message: code },
    });
  }
}

/**
 * 生成时**现取一次模板**，不用创建时的快照。
 *
 * 模板改了之后重新生成就该按新规矩来——那正是「定 SOP」的意义。填写记录用快照
 * （`brief_values`），规矩用现值，两者的取舍方向刚好相反。
 */
async function loadGenerateTemplate(
  tenant_id: string,
  template_id: string | null,
): Promise<GenerateContentTemplate | null> {
  if (!template_id) return null;
  const template = await prisma.contentTemplate.findFirst({
    where: withTenantScope(tenant_id, { id: template_id }),
    select: { guidelines: true, output_rules: true, samples: true },
  });
  if (!template) return null;
  return {
    guidelines: template.guidelines,
    output_rules: normalizeOutputRules(template.output_rules),
    samples: normalizeSamples(template.samples),
  };
}

export async function failStaleGeneratingContents(): Promise<number> {
  const cutoff = new Date(Date.now() - CONTENT_STALE_GENERATING_MS);
  const result = await prisma.content.updateMany({
    where: {
      status: "generating",
      updated_at: { lt: cutoff },
    },
    data: {
      status: "failed",
      error_message: "content.generate_timeout",
    },
  });
  return result.count;
}
