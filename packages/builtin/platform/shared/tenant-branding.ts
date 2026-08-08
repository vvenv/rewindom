import type { TenantBrandingUrls } from "@be-water/shared";

/** `TenantSetting.key` —— 租户品牌（logo / favicon）。 */
export const TENANT_SETTING_KEY_BRANDING = "branding";

export type TenantBrandingAssetKind = "logo" | "favicon";

export interface TenantBrandingAsset {
  storage_key: string;
  mime_type: string;
  updated_at: string;
}

/** 租户品牌配置；字段为 `null` 表示使用产品默认资产。 */
export interface TenantBranding {
  logo: TenantBrandingAsset | null;
  favicon: TenantBrandingAsset | null;
}

export const DEFAULT_TENANT_BRANDING: TenantBranding = {
  logo: null,
  favicon: null,
};

export type { TenantBrandingUrls };

export const LOGO_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export const FAVICON_ALLOWED_MIME_TYPES = [
  ...LOGO_ALLOWED_MIME_TYPES,
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const;

export const LOGO_MAX_BYTES = 1 * 1024 * 1024;
export const FAVICON_MAX_BYTES = 256 * 1024;

export function buildTenantBrandingPublicPath(
  slug: string,
  kind: TenantBrandingAssetKind,
): string {
  return `/api/public/tenants/${encodeURIComponent(slug)}/branding/${kind}`;
}

export function buildTenantBrandingPublicUrl(
  slug: string,
  kind: TenantBrandingAssetKind,
  updatedAt: string | null | undefined,
): string {
  const path = buildTenantBrandingPublicPath(slug, kind);
  if (!updatedAt) return path;
  return `${path}?v=${encodeURIComponent(updatedAt)}`;
}

export function brandingUrlsFromAssets(
  slug: string,
  branding: TenantBranding,
): TenantBrandingUrls {
  return {
    logo_url: branding.logo
      ? buildTenantBrandingPublicUrl(slug, "logo", branding.logo.updated_at)
      : null,
    favicon_url: branding.favicon
      ? buildTenantBrandingPublicUrl(
          slug,
          "favicon",
          branding.favicon.updated_at,
        )
      : null,
  };
}
