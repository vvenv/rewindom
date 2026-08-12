import { Prisma } from "../../generated/prisma/client/client.js";
import { config } from "../../lib/config.js";
import { prisma } from "../../lib/prisma.js";
import { decryptTenantSecret } from "../../lib/tenant-secret-crypto.js";

import type { OAuthProviderId } from "./oauth-common.js";

/*
 * OAuth 凭证有两条**互不相通**的解析链：
 *
 * - **中台**（`/api/auth/oauth/*`）永远用平台 env。租户成员是平台的客户，授权页上
 *   显示平台的应用名才是对的归属；给中台开租户覆盖，等于让「Acme 的员工用 Acme 的
 *   App 登平台的后台」这条链路存在。
 * - **站点会员**（`/api/member/oauth/*`）走站点覆盖 → 平台兜底。官网访客是租户的
 *   终端用户，授权页该显示租户自己的应用名。
 *
 * 拆成两个函数而不是留一个可选的 `tenantId`：类型上锁死，中台那条路想把租户 id
 * 传进来都传不进去。
 */

/** TenantSetting key：整包 JSON 密文，按 provider 覆盖平台 env。**只作用于站点会员登录。** */
export const SITE_OAUTH_PROVIDERS_SETTING_KEY = "site_oauth_providers";

export type OAuthCredentialSource = "platform" | "tenant";

export interface OAuthEnabledFlags {
  github_oauth_enabled: boolean;
  google_oauth_enabled: boolean;
  microsoft_oauth_enabled: boolean;
}

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

/** 平台 env 凭证——中台登录**只**用这一条，不查库。 */
export function resolvePlatformOAuthCredentials(
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

async function loadSiteOAuthProviders(
  tenantId: string,
): Promise<StoredOAuthProviders | null> {
  try {
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
 * 站点会员登录的凭证：站点覆盖（完整 client_id + client_secret）优先，否则平台 env。
 */
export async function resolveSiteOAuthCredentials(
  provider: OAuthProviderId,
  tenantId: string,
): Promise<ResolvedOAuthCredentials> {
  const platform = resolvePlatformOAuthCredentials(provider);

  const stored = await loadSiteOAuthProviders(tenantId);
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

/** 中台登录页显不显 OAuth 按钮——只看平台 env。 */
export function platformOAuthEnabledFlags(): OAuthEnabledFlags {
  return {
    github_oauth_enabled: resolvePlatformOAuthCredentials("github").enabled,
    google_oauth_enabled: resolvePlatformOAuthCredentials("google").enabled,
    microsoft_oauth_enabled:
      resolvePlatformOAuthCredentials("microsoft").enabled,
  };
}

/** 官网会员登录页显不显 OAuth 按钮——站点覆盖生效后即便平台没配也算可用。 */
export async function siteOAuthEnabledFlags(
  tenantId: string,
): Promise<OAuthEnabledFlags> {
  const [github, google, microsoft] = await Promise.all([
    resolveSiteOAuthCredentials("github", tenantId),
    resolveSiteOAuthCredentials("google", tenantId),
    resolveSiteOAuthCredentials("microsoft", tenantId),
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
