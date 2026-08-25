import { prisma } from "@rewindom/module-sdk/server";

import { buildContentPreview } from "./content.util.js";

import {
  isContentAssetKind,
  isContentFormat,
  isContentStatus,
  type Content,
  type ContentAsset,
  type ContentListItem,
} from "../shared/index.js";

type ContentRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.content.findFirst>>
>;
type ContentAssetRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.contentAsset.findFirst>>
>;
type ContentWithAssets = ContentRecord & { assets: ContentAssetRecord[] };
type ContentWithCount = ContentRecord & { _count: { assets: number } };

export function toContentAsset(record: ContentAssetRecord): ContentAsset {
  return {
    id: record.id,
    kind: isContentAssetKind(record.kind) ? record.kind : "text",
    mime_type: record.mime_type,
    filename: record.filename,
    size_bytes: record.size_bytes,
    text_body: record.text_body,
    sort_order: record.sort_order,
    created_at: record.created_at.toISOString(),
  };
}

export function toContentListItem(record: ContentWithCount): ContentListItem {
  return {
    id: record.id,
    title: record.title,
    body_preview: buildContentPreview(record.body),
    format: isContentFormat(record.format) ? record.format : "note",
    status: isContentStatus(record.status) ? record.status : "draft",
    asset_count: record._count.assets,
    error_message: record.error_message,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function toContent(record: ContentWithAssets): Content {
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    title: record.title,
    body: record.body,
    brief: record.brief,
    format: isContentFormat(record.format) ? record.format : "note",
    status: isContentStatus(record.status) ? record.status : "draft",
    tags: record.tags,
    error_message: record.error_message,
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
    assets: [...record.assets]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toContentAsset),
  };
}
