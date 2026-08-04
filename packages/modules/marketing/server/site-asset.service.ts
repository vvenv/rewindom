import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import {
  getFileStorageProvider,
  mimeTypeToExtension,
} from "@be-water/server-kernel/infra/file-storage/local-file-storage.js";
import {
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

const MAX_BYTES = 5 * 1024 * 1024;

export function buildSiteAssetStorageKey(
  tenantId: string,
  assetId: string,
  mimeType: string,
): string {
  const ext = mimeTypeToExtension(mimeType) || ".bin";
  return `${tenantId}/site-assets/${assetId}${ext}`;
}

export function publicSiteAssetUrl(
  tenantSlug: string,
  filename: string,
): string {
  return `/api/public/tenants/${encodeURIComponent(tenantSlug)}/site-assets/${encodeURIComponent(filename)}`;
}

export async function uploadSiteAsset(input: {
  tenant_id: string;
  tenant_slug: string;
  buffer: Buffer;
  mime_type: string;
}): Promise<{ url: string }> {
  const mime = input.mime_type.trim().toLowerCase();
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
    throw new ValidationError("site.asset_invalid_mime");
  }
  if (input.buffer.byteLength === 0) {
    throw new ValidationError("site.asset_required");
  }
  if (input.buffer.byteLength > MAX_BYTES) {
    throw new ValidationError("site.asset_too_large", { max_bytes: MAX_BYTES });
  }

  const assetId = randomUUID();
  const ext = mimeTypeToExtension(mime) || ".bin";
  const filename = `${assetId}${ext}`;
  const storageKey = buildSiteAssetStorageKey(
    input.tenant_id,
    assetId,
    mime,
  );
  await getFileStorageProvider().put(storageKey, input.buffer, {
    mime_type: mime,
  });
  return { url: publicSiteAssetUrl(input.tenant_slug, filename) };
}

export async function openSiteAssetStream(input: {
  tenant_slug: string;
  filename: string;
}): Promise<{ stream: ReturnType<ReturnType<typeof getFileStorageProvider>["createReadStream"]>; mime_type: string; size: number }> {
  const slug = input.tenant_slug.trim().toLowerCase();
  const filename = input.filename.trim();
  if (!slug || !filename || filename.includes("/") || filename.includes("..")) {
    throw new NotFoundError("site.asset_not_found");
  }

  // 公开资源按 URL slug 解析租户：此时尚无 tenant 上下文，只能查 slug。
  // eslint-disable-next-line tenant-scope/require-tenant-scope -- slug → id 解析
  const tenant = await prisma.tenant.findFirst({
    where: { slug },
    select: { id: true },
  });
  if (!tenant) {
    throw new NotFoundError("site.asset_not_found");
  }

  const ext = extname(filename).toLowerCase();
  const assetId = filename.slice(0, filename.length - ext.length);
  if (!assetId) {
    throw new NotFoundError("site.asset_not_found");
  }

  const storageKey = buildSiteAssetStorageKey(tenant.id, assetId, guessMime(ext));
  const storage = getFileStorageProvider();
  const absolutePath = storage.resolveAbsolutePath(storageKey);
  const { stat } = await import("node:fs/promises");
  const fileStat = await stat(absolutePath).catch(() => null);
  if (!fileStat || !fileStat.isFile()) {
    throw new NotFoundError("site.asset_not_found");
  }

  return {
    stream: storage.createReadStream(storageKey),
    mime_type: guessMime(ext),
    size: fileStat.size,
  };
}

function guessMime(ext: string): string {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
