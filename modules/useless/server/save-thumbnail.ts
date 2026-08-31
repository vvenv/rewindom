/**
 * 把截下来的 JPEG 写进官网媒体库，URL 存回 Thing.thumbnail。
 *
 * 已经是本租户媒体库地址的，覆盖同一把键（公开 URL 不变）；否则新传一张。
 */
import {
  replaceSiteAsset,
  uploadSiteAsset,
} from "@rewindom/builtin/marketing/server/site-asset.service.js";

export function parseSiteAssetIdFromThumbnailUrl(
  url: string,
  tenantSlug: string,
): string | null {
  const path = (() => {
    try {
      return url.startsWith("http") ? new URL(url).pathname : url;
    } catch {
      return url;
    }
  })();
  const marker = "/site-assets/";
  const index = path.lastIndexOf(marker);
  if (index < 0) return null;
  const encodedTenant = `/api/public/tenants/${encodeURIComponent(tenantSlug)}/`;
  const rawTenant = `/api/public/tenants/${tenantSlug}/`;
  if (!path.includes(encodedTenant) && !path.includes(rawTenant)) {
    return null;
  }
  const filename = decodeURIComponent(
    path.slice(index + marker.length).split(/[?#]/u)[0] ?? "",
  );
  const match = filename.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpe?g|png|webp)$/i,
  );
  return match?.[1] ?? null;
}

export async function saveThingThumbnail(input: {
  tenant_id: string;
  tenant_slug: string;
  jpeg: Buffer;
  existing_url?: string;
}): Promise<string> {
  const existingId = input.existing_url
    ? parseSiteAssetIdFromThumbnailUrl(input.existing_url, input.tenant_slug)
    : null;
  if (existingId) {
    const replaced = await replaceSiteAsset({
      tenant_id: input.tenant_id,
      tenant_slug: input.tenant_slug,
      id: existingId,
      buffer: input.jpeg,
      mime_type: "image/jpeg",
      filename: `${existingId}.jpg`,
    });
    if (replaced) return replaced.url;
  }

  const uploaded = await uploadSiteAsset({
    tenant_id: input.tenant_id,
    tenant_slug: input.tenant_slug,
    buffer: input.jpeg,
    mime_type: "image/jpeg",
    filename: "thumbnail.jpg",
  });
  return uploaded.url;
}
