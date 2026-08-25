import {
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
  type Prisma,
} from "@rewindom/module-sdk/server";

import {
  toContentTemplate,
  toContentTemplateListItem,
} from "./content.mapper.js";

import {
  CONTENT_TEMPLATE_DESCRIPTION_MAX_LENGTH,
  CONTENT_TEMPLATE_FIELDS_MAX,
  CONTENT_TEMPLATE_GUIDELINES_MAX_LENGTH,
  CONTENT_TEMPLATE_NAME_MAX_LENGTH,
  findContentTemplatePreset,
  isContentFormat,
  normalizeOutputRules,
  normalizeSamples,
  normalizeTemplateFields,
  type ContentTemplate,
  type ContentTemplateBody,
  type ContentTemplateListItem,
} from "../shared/index.js";

import type { AppLocale } from "@rewindom/module-sdk";

/**
 * 模板的写入一律先过 `normalize*`：那几个函数是字段模型的唯一真相源，
 * 服务端不再各写一套校验，否则前端拦得住的租户手改 API 就绕得过去。
 */
function parseTemplateBody(body: ContentTemplateBody): {
  name: string;
  description: string;
  format: string;
  fields: Prisma.InputJsonValue;
  guidelines: string;
  output_rules: Prisma.InputJsonValue;
  samples: Prisma.InputJsonValue;
} {
  const name = (body.name ?? "").trim();
  if (!name) {
    throw new ValidationError("content.template.name_required");
  }
  if (name.length > CONTENT_TEMPLATE_NAME_MAX_LENGTH) {
    throw new ValidationError("content.template.name_too_long", {
      max: CONTENT_TEMPLATE_NAME_MAX_LENGTH,
    });
  }

  const format = body.format ?? "note";
  if (!isContentFormat(format)) {
    throw new ValidationError("content.invalid_format");
  }

  const fields = normalizeTemplateFields(body.fields);
  if (fields.length === 0) {
    // 没有字段的模板等于没有 SOP，创建出来只会让人以为配好了
    throw new ValidationError("content.template.fields_required");
  }
  if (
    Array.isArray(body.fields) &&
    body.fields.length > CONTENT_TEMPLATE_FIELDS_MAX
  ) {
    throw new ValidationError("content.template.too_many_fields", {
      max: CONTENT_TEMPLATE_FIELDS_MAX,
    });
  }

  const guidelines = (body.guidelines ?? "").trim();
  if (guidelines.length > CONTENT_TEMPLATE_GUIDELINES_MAX_LENGTH) {
    throw new ValidationError("content.template.guidelines_too_long", {
      max: CONTENT_TEMPLATE_GUIDELINES_MAX_LENGTH,
    });
  }

  return {
    name,
    description: (body.description ?? "")
      .trim()
      .slice(0, CONTENT_TEMPLATE_DESCRIPTION_MAX_LENGTH),
    format,
    fields: fields as unknown as Prisma.InputJsonValue,
    guidelines,
    output_rules: normalizeOutputRules(
      body.output_rules,
    ) as unknown as Prisma.InputJsonValue,
    samples: normalizeSamples(body.samples) as unknown as Prisma.InputJsonValue,
  };
}

export async function listContentTemplates(
  tenant_id: string,
): Promise<ContentTemplateListItem[]> {
  const records = await prisma.contentTemplate.findMany({
    where: withTenantScope(tenant_id, {}),
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });
  return records.map(toContentTemplateListItem);
}

export async function getContentTemplate(
  tenant_id: string,
  template_id: string,
): Promise<ContentTemplate> {
  const record = await prisma.contentTemplate.findFirst({
    where: withTenantScope(tenant_id, { id: template_id }),
  });
  if (!record) {
    throw new NotFoundError("content.template.not_found");
  }
  return toContentTemplate(record);
}

async function nextSortOrder(tenant_id: string): Promise<number> {
  const last = await prisma.contentTemplate.findFirst({
    where: withTenantScope(tenant_id, {}),
    orderBy: { sort_order: "desc" },
    select: { sort_order: true },
  });
  return (last?.sort_order ?? -1) + 1;
}

export async function createContentTemplate(params: {
  tenant_id: string;
  user_id: string;
  body: ContentTemplateBody;
}): Promise<ContentTemplate> {
  const parsed = parseTemplateBody(params.body);
  const record = await prisma.contentTemplate.create({
    data: {
      ...parsed,
      tenant_id: params.tenant_id,
      sort_order: await nextSortOrder(params.tenant_id),
      created_by: params.user_id,
    },
  });
  return toContentTemplate(record);
}

/**
 * 复制内置预设成租户自己的模板。
 *
 * 复制的是**当下这份常量的快照**：之后预设改了，已复制出去的不动。租户改过的规矩
 * 不该被一次版本升级悄悄改写。`preset_key` 只标来源，不建立跟随关系。
 */
export async function createContentTemplateFromPreset(params: {
  tenant_id: string;
  user_id: string;
  locale: AppLocale;
  preset_key: string;
}): Promise<ContentTemplate> {
  const preset = findContentTemplatePreset(params.locale, params.preset_key);
  if (!preset) {
    throw new NotFoundError("content.template.preset_not_found");
  }

  const record = await prisma.contentTemplate.create({
    data: {
      tenant_id: params.tenant_id,
      name: preset.name,
      description: preset.description,
      format: preset.format,
      fields: preset.fields as unknown as Prisma.InputJsonValue,
      guidelines: preset.guidelines,
      output_rules: preset.output_rules as unknown as Prisma.InputJsonValue,
      samples: preset.samples as unknown as Prisma.InputJsonValue,
      preset_key: preset.key,
      sort_order: await nextSortOrder(params.tenant_id),
      created_by: params.user_id,
    },
  });
  return toContentTemplate(record);
}

export async function updateContentTemplate(params: {
  tenant_id: string;
  user_id: string;
  template_id: string;
  body: ContentTemplateBody;
}): Promise<ContentTemplate> {
  const existing = await prisma.contentTemplate.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.template_id }),
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError("content.template.not_found");
  }

  const parsed = parseTemplateBody(params.body);
  const record = await prisma.contentTemplate.update({
    where: withTenantScope(params.tenant_id, { id: params.template_id }),
    data: { ...parsed, updated_by: params.user_id },
  });
  return toContentTemplate(record);
}

/**
 * 删模板**不**动已经用过它的内容。
 *
 * `brief_values` 是自描述的（`[{ id, label, value }]`），模板没了那条填写记录照样
 * 读得懂；悬空的 `template_id` 顶多让「按这个模板重填」这一个动作不可用。为此去做
 * 软删或级联清空，代价比收益大。
 */
export async function deleteContentTemplate(
  tenant_id: string,
  template_id: string,
): Promise<void> {
  const existing = await prisma.contentTemplate.findFirst({
    where: withTenantScope(tenant_id, { id: template_id }),
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError("content.template.not_found");
  }
  await prisma.contentTemplate.delete({
    where: withTenantScope(tenant_id, { id: template_id }),
  });
}
