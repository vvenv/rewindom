import { stat } from "node:fs/promises";

import {
  getFileStorageProvider,
  buildTenantBrandingStorageKey,
} from "@be-water/server-kernel/infra/file-storage/local-file-storage.js";
import {
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import {
  brandingUrlsFromAssets,
  DEFAULT_TENANT_BRANDING,
  FAVICON_ALLOWED_MIME_TYPES,
  FAVICON_MAX_BYTES,
  LOGO_ALLOWED_MIME_TYPES,
  LOGO_MAX_BYTES,
  TENANT_SETTING_KEY_BRANDING,
  type TenantBranding,
  type TenantBrandingAsset,
  type TenantBrandingAssetKind,
  type TenantBrandingUrls,
} from "../../shared/index.js";

import {
  getTenantJsonSetting,
  saveTenantJsonSetting,
} from "./tenant-json-setting.service.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAsset(
  raw: unknown,
): TenantBrandingAsset | null {
  if (!isRecord(raw)) return null;
  const storage_key =
    typeof raw.storage_key === "string" ? raw.storage_key.trim() : "";
  const mime_type =
    typeof raw.mime_type === "string" ? raw.mime_type.trim() : "";
  const updated_at =
    typeof raw.updated_at === "string" ? raw.updated_at.trim() : "";
  if (!storage_key || !mime_type || !updated_at) return null;
  return { storage_key, mime_type, updated_at };
}

function normalize(
  raw: Partial<TenantBranding> | null | undefined,
): TenantBranding {
  return {
    logo: normalizeAsset(raw?.logo),
    favicon: normalizeAsset(raw?.favicon),
  };
}

export async function getTenantBranding(
  tenantId: string,
): Promise<TenantBranding> {
  return getTenantJsonSetting<TenantBranding>(
    tenantId,
    TENANT_SETTING_KEY_BRANDING,
    normalize,
    DEFAULT_TENANT_BRANDING,
  );
}

export async function getTenantBrandingUrls(
  tenantId: string,
  tenantSlug: string,
): Promise<TenantBrandingUrls> {
  const branding = await getTenantBranding(tenantId);
  return brandingUrlsFromAssets(tenantSlug, branding);
}

function allowedMimeTypes(
  kind: TenantBrandingAssetKind,
): readonly string[] {
  return kind === "logo" ? LOGO_ALLOWED_MIME_TYPES : FAVICON_ALLOWED_MIME_TYPES;
}

function maxBytes(kind: TenantBrandingAssetKind): number {
  return kind === "logo" ? LOGO_MAX_BYTES : FAVICON_MAX_BYTES;
}

export async function uploadTenantBrandingAsset(input: {
  tenant_id: string;
  tenant_slug: string;
  kind: TenantBrandingAssetKind;
  buffer: Buffer;
  mime_type: string;
}): Promise<TenantBrandingUrls> {
  const mime = input.mime_type.trim().toLowerCase();
  if (!allowedMimeTypes(input.kind).includes(mime)) {
    throw new ValidationError("branding.invalid_mime");
  }
  if (input.buffer.byteLength === 0) {
    throw new ValidationError("branding.file_required");
  }
  if (input.buffer.byteLength > maxBytes(input.kind)) {
    throw new ValidationError("branding.file_too_large", {
      max_bytes: maxBytes(input.kind),
    });
  }

  const current = await getTenantBranding(input.tenant_id);
  const storage = getFileStorageProvider();
  const storage_key = buildTenantBrandingStorageKey(
    input.tenant_id,
    input.kind,
    mime,
  );
  const previous = current[input.kind];

  await storage.put(storage_key, input.buffer, { mime_type: mime });

  const nextAsset: TenantBrandingAsset = {
    storage_key,
    mime_type: mime,
    updated_at: new Date().toISOString(),
  };
  const next: TenantBranding = {
    ...current,
    [input.kind]: nextAsset,
  };

  await saveTenantJsonSetting(
    input.tenant_id,
    TENANT_SETTING_KEY_BRANDING,
    next,
  );

  if (previous && previous.storage_key !== storage_key) {
    await storage.delete(previous.storage_key);
  }

  return brandingUrlsFromAssets(input.tenant_slug, next);
}

export async function clearTenantBrandingAsset(input: {
  tenant_id: string;
  tenant_slug: string;
  kind: TenantBrandingAssetKind;
}): Promise<TenantBrandingUrls> {
  const current = await getTenantBranding(input.tenant_id);
  const previous = current[input.kind];
  if (!previous) {
    return brandingUrlsFromAssets(input.tenant_slug, current);
  }

  const next: TenantBranding = {
    ...current,
    [input.kind]: null,
  };
  await saveTenantJsonSetting(
    input.tenant_id,
    TENANT_SETTING_KEY_BRANDING,
    next,
  );

  const storage = getFileStorageProvider();
  await storage.delete(previous.storage_key);

  return brandingUrlsFromAssets(input.tenant_slug, next);
}

export async function openTenantBrandingAssetStream(input: {
  tenant_slug: string;
  kind: TenantBrandingAssetKind;
}): Promise<{ stream: ReturnType<
  ReturnType<typeof getFileStorageProvider>["createReadStream"]
>; mime_type: string; size: number }> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: input.tenant_slug },
    select: { id: true },
  });
  if (!tenant) {
    throw new NotFoundError("branding.not_found");
  }

  const branding = await getTenantBranding(tenant.id);
  const asset = branding[input.kind];
  if (!asset) {
    throw new NotFoundError("branding.not_found");
  }

  const storage = getFileStorageProvider();
  const absolutePath = storage.resolveAbsolutePath(asset.storage_key);
  let size = 0;
  try {
    size = (await stat(absolutePath)).size;
  } catch {
    throw new NotFoundError("branding.not_found");
  }

  return {
    stream: storage.createReadStream(asset.storage_key),
    mime_type: asset.mime_type,
    size,
  };
}
