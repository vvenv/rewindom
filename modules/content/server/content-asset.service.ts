import { randomUUID } from "node:crypto";

import {
  ConflictError,
  NotFoundError,
  ValidationError,
  getFileStorageProvider,
  mimeTypeToExtension,
  prisma,
  validateImageUpload,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import { toContent, toContentAsset } from "./content.mapper.js";
import {
  CONTENT_ASSETS_MAX,
  CONTENT_IMAGE_MAX_BYTES,
  CONTENT_IMAGE_MIME_TYPES,
  CONTENT_TEXT_ASSET_MAX_LENGTH,
  CONTENT_VIDEO_MAX_BYTES,
  CONTENT_VIDEO_MIME_TYPES,
  contentAssetObjectKey,
} from "./content.util.js";

import type { Content, ContentAsset } from "../shared/index.js";

const VIDEO_MIME_ALIASES: Record<string, string> = {
  "video/x-m4v": "video/mp4",
  "video/mpeg": "video/mp4",
};

function normalizeVideoMime(
  mimeType: string,
  filename: string | undefined,
): string | null {
  const raw = mimeType.trim().toLowerCase();
  const aliased = VIDEO_MIME_ALIASES[raw] ?? raw;
  if ((CONTENT_VIDEO_MIME_TYPES as readonly string[]).includes(aliased)) {
    return aliased;
  }
  const ext = filename?.includes(".")
    ? filename.slice(filename.lastIndexOf(".")).toLowerCase()
    : "";
  if (ext === ".mp4" || ext === ".m4v") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".mov") return "video/quicktime";
  return null;
}

async function requireContent(
  tenantId: string,
  contentId: string,
): Promise<Content> {
  const record = await prisma.content.findFirst({
    where: withTenantScope(tenantId, { id: contentId }),
    include: { assets: true },
  });
  if (!record) {
    throw new NotFoundError("content.not_found");
  }
  return toContent(record);
}

async function assertWritable(
  tenantId: string,
  contentId: string,
): Promise<Content> {
  const content = await requireContent(tenantId, contentId);
  if (content.status === "generating") {
    throw new ConflictError("content.generating");
  }
  if (content.assets.length >= CONTENT_ASSETS_MAX) {
    throw new ValidationError("content.assets_limit", {
      max: CONTENT_ASSETS_MAX,
    });
  }
  return content;
}

export async function addContentTextAsset(params: {
  tenant_id: string;
  content_id: string;
  text_body: string;
  filename?: string;
}): Promise<ContentAsset> {
  const text = params.text_body.trim();
  if (!text) {
    throw new ValidationError("content.text_required");
  }
  if (text.length > CONTENT_TEXT_ASSET_MAX_LENGTH) {
    throw new ValidationError("content.text_too_long", {
      max: CONTENT_TEXT_ASSET_MAX_LENGTH,
    });
  }

  const content = await assertWritable(params.tenant_id, params.content_id);
  const record = await prisma.contentAsset.create({
    data: {
      tenant_id: params.tenant_id,
      content_id: content.id,
      kind: "text",
      mime_type: "text/plain",
      filename: (params.filename ?? "").trim().slice(0, 200),
      size_bytes: Buffer.byteLength(text, "utf8"),
      text_body: text,
      sort_order: content.assets.length,
    },
  });
  return toContentAsset(record);
}

export async function addContentFileAsset(params: {
  tenant_id: string;
  content_id: string;
  buffer: Buffer;
  mime_type: string;
  filename?: string;
}): Promise<ContentAsset> {
  const content = await assertWritable(params.tenant_id, params.content_id);
  const videoMime = normalizeVideoMime(params.mime_type, params.filename);

  if (videoMime) {
    if (params.buffer.byteLength === 0) {
      throw new ValidationError("content.asset_empty");
    }
    if (params.buffer.byteLength > CONTENT_VIDEO_MAX_BYTES) {
      throw new ValidationError("content.asset_too_large", {
        max_bytes: CONTENT_VIDEO_MAX_BYTES,
      });
    }
    return putFileAsset({
      tenant_id: params.tenant_id,
      content,
      buffer: params.buffer,
      mime_type: videoMime,
      filename: params.filename,
      kind: "video",
    });
  }

  const { mime_type, buffer } = await validateImageUpload(
    params.buffer,
    params.mime_type,
    {
      allowed_mime_types: CONTENT_IMAGE_MIME_TYPES,
      max_bytes: CONTENT_IMAGE_MAX_BYTES,
      error_codes: {
        invalid_mime: "content.asset_invalid_mime",
        empty: "content.asset_empty",
        too_large: "content.asset_too_large",
        unsafe_svg: "content.asset_unsafe_svg",
      },
    },
    { filename: params.filename },
  );

  return putFileAsset({
    tenant_id: params.tenant_id,
    content,
    buffer,
    mime_type,
    filename: params.filename,
    kind: "image",
  });
}

async function putFileAsset(params: {
  tenant_id: string;
  content: Content;
  buffer: Buffer;
  mime_type: string;
  filename?: string;
  kind: "image" | "video";
}): Promise<ContentAsset> {
  const assetId = randomUUID();
  const ext = mimeTypeToExtension(params.mime_type) || ".bin";
  const storageKey = contentAssetObjectKey(
    params.tenant_id,
    params.content.id,
    assetId,
    ext,
  );

  await getFileStorageProvider().put(storageKey, params.buffer, {
    mime_type: params.mime_type,
    visibility: "private",
    cache_control: "private, max-age=0, must-revalidate",
  });

  const record = await prisma.contentAsset.create({
    data: {
      id: assetId,
      tenant_id: params.tenant_id,
      content_id: params.content.id,
      kind: params.kind,
      mime_type: params.mime_type,
      filename: (params.filename ?? `${assetId}${ext}`).trim().slice(0, 200),
      size_bytes: params.buffer.byteLength,
      storage_key: storageKey,
      sort_order: params.content.assets.length,
    },
  });
  return toContentAsset(record);
}

export async function deleteContentAsset(params: {
  tenant_id: string;
  content_id: string;
  asset_id: string;
}): Promise<void> {
  const content = await prisma.content.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.content_id }),
    select: { id: true, status: true },
  });
  if (!content) {
    throw new NotFoundError("content.not_found");
  }
  if (content.status === "generating") {
    throw new ConflictError("content.generating");
  }

  const asset = await prisma.contentAsset.findFirst({
    where: withTenantScope(params.tenant_id, {
      id: params.asset_id,
      content_id: params.content_id,
    }),
  });
  if (!asset) {
    throw new NotFoundError("content.asset_not_found");
  }

  if (asset.storage_key) {
    await getFileStorageProvider().delete(asset.storage_key);
  }

  await prisma.contentAsset.delete({
    where: withTenantScope(params.tenant_id, { id: asset.id }),
  });
}

export async function getContentAssetRecord(params: {
  tenant_id: string;
  content_id: string;
  asset_id: string;
}): Promise<{
  mime_type: string;
  filename: string;
  storage_key: string;
}> {
  const asset = await prisma.contentAsset.findFirst({
    where: withTenantScope(params.tenant_id, {
      id: params.asset_id,
      content_id: params.content_id,
    }),
  });
  if (!asset?.storage_key) {
    throw new NotFoundError("content.asset_not_found");
  }
  return {
    mime_type: asset.mime_type,
    filename: asset.filename,
    storage_key: asset.storage_key,
  };
}

export async function deleteStoredAssets(
  assets: Array<{ storage_key: string | null }>,
): Promise<void> {
  const storage = getFileStorageProvider();
  await Promise.all(
    assets
      .map((asset) => asset.storage_key)
      .filter((key): key is string => Boolean(key))
      .map((key) => storage.delete(key)),
  );
}
