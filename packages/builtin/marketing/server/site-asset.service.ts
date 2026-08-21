import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { getFileStorageProvider } from "@rewindom/server-kernel/infra/file-storage/index.js";
import { NotFoundError } from "@rewindom/server-kernel/lib/app-errors.js";
import { validateImageUpload } from "@rewindom/server-kernel/lib/image-upload.js";
import {
  extensionToMimeType,
  mimeTypeToExtension,
} from "@rewindom/server-kernel/lib/mime.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";

import { SITE_ASSET_MIME_TYPES, type SiteAsset } from "../shared/site-asset.js";

import { readImageDimensions } from "./image-dimensions.js";

const ALLOWED_MIME_TYPES = SITE_ASSET_MIME_TYPES;

const MAX_BYTES = 5 * 1024 * 1024;

/** 替换会改同一把键的内容，不能用一年 immutable。 */
export const SITE_ASSET_CACHE_CONTROL = "public, max-age=0, must-revalidate";

export function siteAssetObjectKey(
  tenantId: string,
  filename: string,
): string {
  return `${tenantId}/site-assets/${filename}`;
}

export function buildSiteAssetStorageKey(
  tenantId: string,
  assetId: string,
  mimeType: string,
): string {
  const ext = mimeTypeToExtension(mimeType) || ".bin";
  return siteAssetObjectKey(tenantId, `${assetId}${ext}`);
}

export function publicSiteAssetUrl(
  tenantSlug: string,
  filename: string,
): string {
  /*
   * 稳定应用路径：写进区块 / 主题 JSON。公开 SSR 在有 S3_PUBLIC_BASE_URL 时
   * 再改写成 CDN（见 rewrite-site-asset-urls.ts），不要在这里直接返回直链。
   */
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
  updated_at: Date;
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
    updated_at: row.updated_at.toISOString(),
  };
}

async function validateSiteAssetBytes(input: {
  buffer: Buffer;
  mime_type: string;
  filename?: string;
}): Promise<{ mime_type: string; buffer: Buffer }> {
  return validateImageUpload(input.buffer, input.mime_type, {
    allowed_mime_types: ALLOWED_MIME_TYPES,
    max_bytes: MAX_BYTES,
    error_codes: {
      invalid_mime: "site.asset_invalid_mime",
      empty: "site.asset_required",
      too_large: "site.asset_too_large",
      unsafe_svg: "site.asset_unsafe_svg",
    },
  }, { filename: input.filename });
}

export async function uploadSiteAsset(input: {
  tenant_id: string;
  tenant_slug: string;
  buffer: Buffer;
  mime_type: string;
  filename?: string;
}): Promise<SiteAsset> {
  // buffer 是消毒后的字节（SVG 会被改写），后面一律用它，别再碰 input.buffer
  const { mime_type: mime, buffer } = await validateSiteAssetBytes(input);

  const assetId = randomUUID();
  const ext = mimeTypeToExtension(mime) || ".bin";
  const filename = `${assetId}${ext}`;
  const storageKey = siteAssetObjectKey(input.tenant_id, filename);
  await getFileStorageProvider().put(storageKey, buffer, {
    mime_type: mime,
    visibility: "public",
    cache_control: SITE_ASSET_CACHE_CONTROL,
  });

  /*
   * 先落盘再落库。反过来的话，写库成功但落盘失败会留下一条指向不存在文件的记录——
   * 媒体库里一张永远加载不出来的裂图，比多一个没人引用的孤儿文件难处理得多。
   */
  const dimensions = readImageDimensions(buffer);
  const row = await prisma.marketingAsset.create({
    data: {
      id: assetId,
      tenant_id: input.tenant_id,
      filename,
      mime_type: mime,
      size_bytes: buffer.byteLength,
      width: dimensions?.width ?? 0,
      height: dimensions?.height ?? 0,
    },
  });
  return toSiteAsset(row, input.tenant_slug);
}

/**
 * 用新文件覆盖已有媒体，**公开 URL 不变**。
 *
 * 页面 / 区块里存的是 `asset.url`（最后一段是 filename）。换一张图如果换 id，
 * 所有引用都会裂；所以落盘键继续用原来的 filename，只改字节、尺寸和 MIME。
 * 格式可以换（png → svg），Content-Type 以库里的 mime_type 为准。
 */
export async function replaceSiteAsset(input: {
  tenant_id: string;
  tenant_slug: string;
  id: string;
  buffer: Buffer;
  mime_type: string;
  filename?: string;
}): Promise<SiteAsset | null> {
  const row = await prisma.marketingAsset.findFirst({
    where: withTenantScope(input.tenant_id, { id: input.id }),
  });
  if (!row) return null;

  const { mime_type: mime, buffer } = await validateSiteAssetBytes(input);
  const storageKey = siteAssetObjectKey(input.tenant_id, row.filename);
  await getFileStorageProvider().put(storageKey, buffer, {
    mime_type: mime,
    visibility: "public",
    cache_control: SITE_ASSET_CACHE_CONTROL,
  });

  const dimensions = readImageDimensions(buffer);
  await prisma.marketingAsset.updateMany({
    where: withTenantScope(input.tenant_id, { id: row.id }),
    data: {
      mime_type: mime,
      size_bytes: buffer.byteLength,
      width: dimensions?.width ?? 0,
      height: dimensions?.height ?? 0,
    },
  });
  const updated = await prisma.marketingAsset.findFirst({
    where: withTenantScope(input.tenant_id, { id: row.id }),
  });
  return updated ? toSiteAsset(updated, input.tenant_slug) : null;
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
    .delete(siteAssetObjectKey(tenant_id, row.filename))
    // 文件先没了也算删成功：目标是「媒体库里不再有它」
    .catch(() => undefined);
  return true;
}

/**
 * 把公开 URL 的 `:slug/:filename` 解析成存储键。
 *
 * 只做定位，不碰字节——取字节是存储后端的事（见 `sendStorageObject`），
 * 这样接对象存储时这里一行不用改。
 *
 * MIME 优先信库：替换可以把 png 换成 svg，扩展名仍停在原来的 filename 上。
 */
export async function resolveSiteAssetStorageKey(input: {
  tenant_slug: string;
  filename: string;
}): Promise<{ storage_key: string; mime_type: string }> {
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

  const row = await prisma.marketingAsset.findFirst({
    where: withTenantScope(tenant.id, { filename }),
    select: { mime_type: true },
  });
  const ext = extname(filename).toLowerCase();
  return {
    storage_key: siteAssetObjectKey(tenant.id, filename),
    mime_type: row?.mime_type || extensionToMimeType(ext),
  };
}
