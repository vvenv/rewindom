import type {
  ContentBriefEntry,
  ContentOutputRules,
  ContentTemplateField,
  ContentTemplateSample,
} from "./content-template.js";

export const CONTENT_FORMATS = ["note", "article"] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export const CONTENT_STATUSES = [
  "draft",
  "generating",
  "ready",
  "failed",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_ASSET_KINDS = ["image", "video", "text"] as const;
export type ContentAssetKind = (typeof CONTENT_ASSET_KINDS)[number];

export function isContentFormat(value: string): value is ContentFormat {
  return (CONTENT_FORMATS as readonly string[]).includes(value);
}

export function isContentStatus(value: string): value is ContentStatus {
  return (CONTENT_STATUSES as readonly string[]).includes(value);
}

export function isContentAssetKind(value: string): value is ContentAssetKind {
  return (CONTENT_ASSET_KINDS as readonly string[]).includes(value);
}

export interface ContentAsset {
  id: string;
  kind: ContentAssetKind;
  mime_type: string;
  filename: string;
  size_bytes: number;
  text_body: string | null;
  sort_order: number;
  created_at: string;
}

export interface Content {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  /** 派生：由 `brief_values` 拼出的纯文本，只读，供搜索与展示。 */
  brief: string;
  brief_values: ContentBriefEntry[];
  template_id: string | null;
  format: ContentFormat;
  status: ContentStatus;
  tags: string[];
  error_message: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  assets: ContentAsset[];
}

export interface ContentListItem {
  id: string;
  title: string;
  body_preview: string;
  format: ContentFormat;
  status: ContentStatus;
  asset_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContentBody {
  title?: string;
  body?: string;
  format?: ContentFormat;
  template_id?: string | null;
  /** 按模板字段 id 提交；服务端拿模板重新验收一遍再落 `brief_values`。 */
  brief_values?: Record<string, string>;
}

export interface UpdateContentBody {
  title?: string;
  body?: string;
  format?: ContentFormat;
  template_id?: string | null;
  brief_values?: Record<string, string>;
}

export interface ContentTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  format: ContentFormat;
  fields: ContentTemplateField[];
  guidelines: string;
  output_rules: ContentOutputRules;
  samples: ContentTemplateSample[];
  /** 从哪个内置预设复制来的，仅作来源标记——不跟随预设更新。 */
  preset_key: string | null;
  sort_order: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentTemplateListItem {
  id: string;
  name: string;
  description: string;
  format: ContentFormat;
  field_count: number;
  sort_order: number;
  updated_at: string;
}

export interface ContentTemplateBody {
  name?: string;
  description?: string;
  format?: ContentFormat;
  fields?: ContentTemplateField[];
  guidelines?: string;
  output_rules?: ContentOutputRules;
  samples?: ContentTemplateSample[];
}

/** 复制内置预设：`preset_key` 取 `contentTemplatePresets()` 里的 key。 */
export interface CreateContentTemplateFromPresetBody {
  preset_key: string;
}

export interface CreateContentTextAssetBody {
  kind: "text";
  text_body: string;
  filename?: string;
}
