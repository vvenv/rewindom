/**
 * 站点收款凭证：**平台 env → 站点覆盖**，与 `oauth-credentials.ts` 同一口径。
 *
 * 没配过的站点用平台默认账号收款（单租户部署里这就是站长自己的账号）；配过的用
 * 自己的。`source` 一路带到设置页上，站长看得见这笔钱进的是谁的账号——收款不像
 * OAuth，静默地用了别人的凭证是要出事的，所以宁可多显示一行。
 *
 * 密钥整包 JSON 加密后落在 `TenantSetting.secret`（同 `site-oauth.service.ts`），
 * 读出来只在服务端用，**任何接口都不回传明文**。
 */

import { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import {
  decryptTenantSecret,
  encryptTenantSecret,
} from "@be-water/server-kernel/lib/tenant-secret-crypto.js";

import type { CreemCredentials } from "../../billing/server/providers/creem.provider.js";
import type { SiteBillingProviderStatus } from "../shared/site-billing.js";

/** TenantSetting key：整包 JSON 密文。 */
export const SITE_BILLING_PROVIDER_SETTING_KEY = "site_billing_provider";

export interface SiteBillingCreemCredentials extends CreemCredentials {
  webhookSecret: string;
  /** 站点自带凭证还是回落到平台默认账号——一路带到设置页上给站长看。 */
  source: "platform" | "tenant";
}

interface StoredCredentials {
  api_key?: string;
  webhook_secret?: string;
}

async function readStored(tenantId: string): Promise<StoredCredentials> {
  const row = await prisma.tenantSetting.findUnique({
    where: {
      tenant_id_key: {
        tenant_id: tenantId,
        key: SITE_BILLING_PROVIDER_SETTING_KEY,
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
    return parsed as StoredCredentials;
  } catch {
    // 解不开就当没配（换过 TENANT_SECRET_KEY 的部署会走到这里）——回落平台凭证，
    // 总好过让整个站点的会员页 500
    return {};
  }
}

async function writeStored(
  tenantId: string,
  value: StoredCredentials,
): Promise<void> {
  if (!value.api_key?.trim()) {
    // 清空 api_key 就是「不再自带凭证」，整行删掉而不是留一个半配的状态
    await prisma.tenantSetting.deleteMany({
      where: {
        tenant_id: tenantId,
        key: SITE_BILLING_PROVIDER_SETTING_KEY,
      },
    });
    return;
  }

  const secret = encryptTenantSecret(JSON.stringify(value));
  await prisma.tenantSetting.upsert({
    where: {
      tenant_id_key: {
        tenant_id: tenantId,
        key: SITE_BILLING_PROVIDER_SETTING_KEY,
      },
    },
    create: {
      tenant_id: tenantId,
      key: SITE_BILLING_PROVIDER_SETTING_KEY,
      value: Prisma.JsonNull,
      secret,
    },
    update: { secret, value: Prisma.JsonNull },
  });
}

export async function resolveSiteBillingCreem(
  tenantId: string,
): Promise<SiteBillingCreemCredentials> {
  const stored = await readStored(tenantId);
  const apiKey = stored.api_key?.trim();
  if (apiKey) {
    return {
      apiKey,
      webhookSecret: stored.webhook_secret?.trim() ?? "",
      server: config.billing.creem.server,
      source: "tenant",
    };
  }
  return {
    apiKey: config.billing.creem.apiKey.trim(),
    webhookSecret: config.billing.creem.webhookSecret.trim(),
    server: config.billing.creem.server,
    source: "platform",
  };
}

/** 尾部片段：够站长认出「填的是哪一把」，又不足以拿去用。 */
function keyHint(apiKey: string): string | null {
  return apiKey ? `…${apiKey.slice(-4)}` : null;
}

export async function getSiteBillingProviderStatus(input: {
  tenant_id: string;
  webhook_url: string;
}): Promise<SiteBillingProviderStatus> {
  const resolved = await resolveSiteBillingCreem(input.tenant_id);
  return {
    configured: Boolean(resolved.apiKey),
    source: resolved.source,
    api_key_hint: keyHint(resolved.apiKey),
    webhook_secret_set: Boolean(resolved.webhookSecret),
    webhook_url: input.webhook_url,
  };
}

/**
 * 保存站点自己的凭证。
 *
 * 只传 `webhook_secret` 而不传 `api_key` 时保留原来的 key（编辑表单里 key 是掩码
 * 显示的，不该因为没重填就被清空）。
 */
export async function updateSiteBillingProvider(input: {
  tenant_id: string;
  api_key?: string;
  webhook_secret?: string;
}): Promise<void> {
  const stored = await readStored(input.tenant_id);
  await writeStored(input.tenant_id, {
    api_key:
      input.api_key !== undefined ? input.api_key.trim() : stored.api_key,
    webhook_secret:
      input.webhook_secret !== undefined
        ? input.webhook_secret.trim()
        : stored.webhook_secret,
  });
}
