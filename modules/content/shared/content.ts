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
  brief: string;
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
  brief?: string;
  body?: string;
  format?: ContentFormat;
}

export interface UpdateContentBody {
  title?: string;
  brief?: string;
  body?: string;
  format?: ContentFormat;
}

export interface CreateContentTextAssetBody {
  kind: "text";
  text_body: string;
  filename?: string;
}
