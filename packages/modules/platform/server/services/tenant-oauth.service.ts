import {
  OAUTH_PROVIDER_IDS,
  OAUTH_PROVIDERS_SETTING_KEY,
  resolveOAuthCredentials,
} from "@be-water/server-kernel/kernel/auth/oauth-credentials.js";
import { ValidationError } from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";
import {
  decryptTenantSecret,
  encryptTenantSecret,
} from "@be-water/server-kernel/lib/tenant-secret-crypto.js";

import type { OAuthProviderId } from "@be-water/server-kernel/kernel/auth/oauth-common.js";
import type {
  TenantOAuthProviderStatus,
  TenantOAuthProvidersStatus,
  UpsertTenantOAuthProviderBody,
} from "../../shared/tenant-oauth.js";

interface StoredProviderOverride {
  client_id?: string;
  client_secret?: string;
  callback_url?: string;
  authority?: string;
}

type StoredOAuthProviders = Partial<
  Record<OAuthProviderId, StoredProviderOverride>
>;

async function readStored(
  tenantId: string,
): Promise<StoredOAuthProviders> {
  const row = await prisma.tenantSetting.findUnique({
    where: {
      tenant_id_key: { tenant_id: tenantId, key: OAUTH_PROVIDERS_SETTING_KEY },
    },
    select: { secret: true },
  });
  const cipher = row?.secret?.trim();
  if (!cipher) return {};
  try {
    const parsed = JSON.parse(decryptTenantSecret(cipher)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as StoredOAuthProviders;
  } catch {
    return {};
  }
}

async function writeStored(
  tenantId: string,
  value: StoredOAuthProviders,
): Promise<void> {
  const hasAny = OAUTH_PROVIDER_IDS.some((id) => {
    const entry = value[id];
    return Boolean(entry?.client_id?.trim() && entry?.client_secret?.trim());
  });

  if (!hasAny) {
    await prisma.tenantSetting.deleteMany({
      where: { tenant_id: tenantId, key: OAUTH_PROVIDERS_SETTING_KEY },
    });
    return;
  }

  const secret = encryptTenantSecret(JSON.stringify(value));
  await prisma.tenantSetting.upsert({
    where: {
      tenant_id_key: { tenant_id: tenantId, key: OAUTH_PROVIDERS_SETTING_KEY },
    },
    create: {
      tenant_id: tenantId,
      key: OAUTH_PROVIDERS_SETTING_KEY,
      value: Prisma.JsonNull,
      secret,
    },
    update: {
      secret,
      value: Prisma.JsonNull,
    },
  });
}

export async function getTenantOAuthProvidersStatus(
  tenantId: string,
): Promise<TenantOAuthProvidersStatus> {
  const stored = await readStored(tenantId);
  const providers: TenantOAuthProviderStatus[] = [];

  for (const provider of OAUTH_PROVIDER_IDS) {
    const resolved = await resolveOAuthCredentials(provider, tenantId);
    const override = stored[provider];
    const tenantConfigured = Boolean(
      override?.client_id?.trim() && override?.client_secret?.trim(),
    );
    providers.push({
      provider,
      enabled: resolved.enabled,
      source: resolved.source,
      tenant_configured: tenantConfigured,
      client_id: tenantConfigured
        ? (override?.client_id?.trim() ?? null)
        : null,
      callback_url: tenantConfigured
        ? (override?.callback_url?.trim() || null)
        : null,
      authority:
        provider === "microsoft" && tenantConfigured
          ? (override?.authority?.trim() || null)
          : null,
    });
  }

  return { providers };
}

export async function upsertTenantOAuthProvider(
  tenantId: string,
  provider: OAuthProviderId,
  body: UpsertTenantOAuthProviderBody,
): Promise<TenantOAuthProvidersStatus> {
  const clientId = body.client_id?.trim() ?? "";
  const clientSecret = body.client_secret?.trim() ?? "";
  if (!clientId || !clientSecret) {
    throw new ValidationError("platform.oauth.credentials_required");
  }

  const stored = await readStored(tenantId);
  const next: StoredProviderOverride = {
    client_id: clientId,
    client_secret: clientSecret,
  };
  const callback = body.callback_url?.trim();
  if (callback) {
    next.callback_url = callback;
  }
  if (provider === "microsoft") {
    const authority = body.authority?.trim();
    if (authority) {
      next.authority = authority;
    }
  }
  stored[provider] = next;
  await writeStored(tenantId, stored);
  return getTenantOAuthProvidersStatus(tenantId);
}

export async function clearTenantOAuthProvider(
  tenantId: string,
  provider: OAuthProviderId,
): Promise<TenantOAuthProvidersStatus> {
  const stored = await readStored(tenantId);
  delete stored[provider];
  await writeStored(tenantId, stored);
  return getTenantOAuthProvidersStatus(tenantId);
}
