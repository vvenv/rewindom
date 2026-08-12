/**
 * 站点会员登录的 OAuth 覆盖：**平台 env → 站点覆盖**，与 `site-billing` 的
 * `provider-credentials.ts` 同一口径。
 *
 * 只作用于官网前台（`/api/member/oauth/*`）。中台登录固定走平台凭证，见
 * `oauth-credentials.ts` 顶部那段说明。
 */

import { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";
import {
  OAUTH_PROVIDER_IDS,
  SITE_OAUTH_PROVIDERS_SETTING_KEY,
  resolveSiteOAuthCredentials,
} from "@be-water/server-kernel/kernel/auth/oauth-credentials.js";
import { ValidationError } from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import {
  decryptTenantSecret,
  encryptTenantSecret,
} from "@be-water/server-kernel/lib/tenant-secret-crypto.js";

import type {
  SiteOAuthProviderStatus,
  SiteOAuthProvidersStatus,
  UpsertSiteOAuthProviderBody,
} from "../shared/site-oauth.js";
import type { OAuthProviderId } from "@be-water/server-kernel/kernel/auth/oauth-common.js";

interface StoredProviderOverride {
  client_id?: string;
  client_secret?: string;
  callback_url?: string;
  authority?: string;
}

type StoredOAuthProviders = Partial<
  Record<OAuthProviderId, StoredProviderOverride>
>;

async function readStored(tenantId: string): Promise<StoredOAuthProviders> {
  const row = await prisma.tenantSetting.findUnique({
    where: {
      tenant_id_key: {
        tenant_id: tenantId,
        key: SITE_OAUTH_PROVIDERS_SETTING_KEY,
      },
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
      where: { tenant_id: tenantId, key: SITE_OAUTH_PROVIDERS_SETTING_KEY },
    });
    return;
  }

  const secret = encryptTenantSecret(JSON.stringify(value));
  await prisma.tenantSetting.upsert({
    where: {
      tenant_id_key: {
        tenant_id: tenantId,
        key: SITE_OAUTH_PROVIDERS_SETTING_KEY,
      },
    },
    create: {
      tenant_id: tenantId,
      key: SITE_OAUTH_PROVIDERS_SETTING_KEY,
      value: Prisma.JsonNull,
      secret,
    },
    update: {
      secret,
      value: Prisma.JsonNull,
    },
  });
}

export async function getSiteOAuthProvidersStatus(
  tenantId: string,
): Promise<SiteOAuthProvidersStatus> {
  const stored = await readStored(tenantId);
  const providers: SiteOAuthProviderStatus[] = [];

  for (const provider of OAUTH_PROVIDER_IDS) {
    const resolved = await resolveSiteOAuthCredentials(provider, tenantId);
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
        ? override?.callback_url?.trim() || null
        : null,
      authority:
        provider === "microsoft" && tenantConfigured
          ? override?.authority?.trim() || null
          : null,
    });
  }

  return { providers };
}

export async function upsertSiteOAuthProvider(
  tenantId: string,
  provider: OAuthProviderId,
  body: UpsertSiteOAuthProviderBody,
): Promise<SiteOAuthProvidersStatus> {
  const clientId = body.client_id?.trim() ?? "";
  const stored = await readStored(tenantId);
  // 密钥不回显，所以「没填」只能理解为沿用旧的——否则改个回调地址都得重新去
  // GitHub 生成一次 secret。
  const clientSecret =
    body.client_secret?.trim() ||
    (stored[provider]?.client_secret?.trim() ?? "");
  if (!clientId || !clientSecret) {
    throw new ValidationError("site_member.oauth_credentials_required");
  }

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
  return getSiteOAuthProvidersStatus(tenantId);
}

export async function clearSiteOAuthProvider(
  tenantId: string,
  provider: OAuthProviderId,
): Promise<SiteOAuthProvidersStatus> {
  const stored = await readStored(tenantId);
  delete stored[provider];
  await writeStored(tenantId, stored);
  return getSiteOAuthProvidersStatus(tenantId);
}
