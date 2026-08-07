import { Prisma } from "../../generated/prisma/client/client.js";
import { config } from "../../lib/config.js";
import { prisma } from "../../lib/prisma.js";
import { decryptTenantSecret } from "../../lib/tenant-secret-crypto.js";

import type { OAuthProviderId } from "./oauth-common.js";

/** TenantSetting key：整包 JSON 密文，按 provider 覆盖平台 env。 */
export const OAUTH_PROVIDERS_SETTING_KEY = "oauth_providers";

export type OAuthCredentialSource = "platform" | "tenant";

export interface ResolvedOAuthCredentials {
  provider: OAuthProviderId;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  /** Microsoft Entra authority；其它 provider 可忽略 */
  authority: string;
  enabled: boolean;
  source: OAuthCredentialSource;
}

interface StoredProviderOverride {
  client_id?: string;
  client_secret?: string;
  callback_url?: string;
  authority?: string;
}

type StoredOAuthProviders = Partial<
  Record<OAuthProviderId, StoredProviderOverride>
>;

function platformCredentials(
  provider: OAuthProviderId,
): ResolvedOAuthCredentials {
  if (provider === "microsoft") {
    const ms = config.auth.microsoft;
    return {
      provider,
      clientId: ms.clientId,
      clientSecret: ms.clientSecret,
      callbackUrl: ms.callbackUrl,
      authority: ms.authority || "common",
      enabled: ms.enabled,
      source: "platform",
    };
  }
  const entry = config.auth[provider];
  return {
    provider,
    clientId: entry.clientId,
    clientSecret: entry.clientSecret,
    callbackUrl: entry.callbackUrl,
    authority: "common",
    enabled: entry.enabled,
    source: "platform",
  };
}

function parseStoredProviders(raw: string): StoredOAuthProviders | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as StoredOAuthProviders;
  } catch {
    return null;
  }
}

async function loadTenantOAuthProviders(
  tenantId: string,
): Promise<StoredOAuthProviders | null> {
  try {
    const row = await prisma.tenantSetting.findUnique({
      where: {
        tenant_id_key: { tenant_id: tenantId, key: OAUTH_PROVIDERS_SETTING_KEY },
      },
      select: { secret: true },
    });
    const cipher = row?.secret?.trim();
    if (!cipher) return null;
    return parseStoredProviders(decryptTenantSecret(cipher));
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2021"
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * 解析 OAuth 凭证：租户覆盖（完整 client_id + client_secret）优先，否则平台 env。
 */
export async function resolveOAuthCredentials(
  provider: OAuthProviderId,
  tenantId?: string | null,
): Promise<ResolvedOAuthCredentials> {
  const platform = platformCredentials(provider);
  if (!tenantId) {
    return platform;
  }

  const stored = await loadTenantOAuthProviders(tenantId);
  const override = stored?.[provider];
  const clientId = override?.client_id?.trim() ?? "";
  const clientSecret = override?.client_secret?.trim() ?? "";
  if (!clientId || !clientSecret) {
    return platform;
  }

  return {
    provider,
    clientId,
    clientSecret,
    callbackUrl: override?.callback_url?.trim() || platform.callbackUrl,
    authority:
      (override?.authority?.trim() || platform.authority || "common").replace(
        /^\/+|\/+$/g,
        "",
      ) || "common",
    enabled: true,
    source: "tenant",
  };
}

export async function resolveOAuthEnabledFlags(tenantId?: string | null): Promise<{
  github_oauth_enabled: boolean;
  google_oauth_enabled: boolean;
  microsoft_oauth_enabled: boolean;
}> {
  const [github, google, microsoft] = await Promise.all([
    resolveOAuthCredentials("github", tenantId),
    resolveOAuthCredentials("google", tenantId),
    resolveOAuthCredentials("microsoft", tenantId),
  ]);
  return {
    github_oauth_enabled: github.enabled,
    google_oauth_enabled: google.enabled,
    microsoft_oauth_enabled: microsoft.enabled,
  };
}

export const OAUTH_PROVIDER_IDS: OAuthProviderId[] = [
  "github",
  "google",
  "microsoft",
];

export function isOAuthProviderId(value: string): value is OAuthProviderId {
  return (OAUTH_PROVIDER_IDS as string[]).includes(value);
}
