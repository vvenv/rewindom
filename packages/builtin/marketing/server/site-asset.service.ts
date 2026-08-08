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
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";

import { readImageDimensions } from "./image-dimensions.js";

import type { SiteAsset } from "../shared/site-asset.js";

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

interface AssetRow {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  width: number;
  height: number;
  alt: string;
  created_at: Date;
}

export type { SiteAsset };

function toSiteAsset(row: AssetRow, tenantSlug: string): SiteAsset {
  return {
    id: row.id,
    filename: row.filename,
    url: publicSiteAssetUrl(tenantSlug, row.filename),
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    width: row.width,
    height: row.height,
    alt: row.alt,
    created_at: row.created_at.toISOString(),
  };
}

export async function uploadSiteAsset(input: {
  tenant_id: string;
  tenant_slug: string;
  buffer: Buffer;
  mime_type: string;
}): Promise<SiteAsset> {
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

  /*
   * 先落盘再落库。反过来的话，写库成功但落盘失败会留下一条指向不存在文件的记录——
   * 媒体库里一张永远加载不出来的裂图，比多一个没人引用的孤儿文件难处理得多。
   */
  const dimensions = readImageDimensions(input.buffer);
  const row = await prisma.marketingAsset.create({
    data: {
      id: assetId,
      tenant_id: input.tenant_id,
      filename,
      mime_type: mime,
      size_bytes: input.buffer.byteLength,
      width: dimensions?.width ?? 0,
      height: dimensions?.height ?? 0,
    },
  });
  return toSiteAsset(row, input.tenant_slug);
}

export async function listSiteAssets(
  tenant_id: string,
  tenant_slug: string,
): Promise<SiteAsset[]> {
  const rows = await prisma.marketingAsset.findMany({
    where: withTenantScope(tenant_id, {}),
    orderBy: { created_at: "desc" },
  });
  return rows.map((row) => toSiteAsset(row, tenant_slug));
}

export async function updateSiteAssetAlt(
  tenant_id: string,
  tenant_slug: string,
  id: string,
  alt: string,
): Promise<SiteAsset | null> {
  const result = await prisma.marketingAsset.updateMany({
    where: withTenantScope(tenant_id, { id }),
    data: { alt: alt.trim().slice(0, 300) },
  });
  if (result.count === 0) return null;
  const row = await prisma.marketingAsset.findFirst({
    where: withTenantScope(tenant_id, { id }),
  });
  return row ? toSiteAsset(row, tenant_slug) : null;
}

/**
 * 删除媒体。
 *
 * **不检查有没有页面还在引用它**：引用散在 section settings 的 JSON 里、还分草稿与线上
 * 两份，逐一扫描既慢又给不出可靠答案（富文本里手写的 URL 就扫不到）。与其给一个似是而非
 * 的「安全」承诺，不如在 UI 上说清楚这是不可逆的。
 *
 * 先删库再删盘：反过来的话删盘成功而删库失败，媒体库里会留下一张裂图。
 */
export async function deleteSiteAsset(
  tenant_id: string,
  id: string,
): Promise<boolean> {
  const row = await prisma.marketingAsset.findFirst({
    where: withTenantScope(tenant_id, { id }),
  });
  if (!row) return false;

  await prisma.marketingAsset.deleteMany({
    where: withTenantScope(tenant_id, { id }),
  });
  await getFileStorageProvider()
    .delete(buildSiteAssetStorageKey(tenant_id, row.id, row.mime_type))
    // 文件先没了也算删成功：目标是「媒体库里不再有它」
    .catch(() => undefined);
  return true;
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
