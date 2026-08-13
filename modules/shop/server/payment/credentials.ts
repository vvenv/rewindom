import {
  config,
  encryptTenantSecret,
  decryptTenantSecret,
  prisma,
  ValidationError,
} from "@rewindom/module-sdk/server";

import type {
  ShopProviderStatus,
  ShopSettingView,
  UpdateShopProviderBody,
  UpdateShopSettingBody,
} from "../../shared/index.js";
import { normalizeCountry, normalizeCurrency } from "../lib/format.js";

export const SHOP_PROVIDER_SETTING_KEY = "shop_stripe_provider";

export interface ShopStripeCredentials {
  secretKey: string;
  webhookSecret: string;
  publishableKey: string;
  source: "platform" | "tenant";
}

interface StoredCredentials {
  secret_key?: string;
  webhook_secret?: string;
  publishable_key?: string;
}

function mask(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length <= 8 ? "••••" : `••••${trimmed.slice(-4)}`;
}

async function readStored(tenantId: string): Promise<StoredCredentials> {
  const row = await prisma.tenantSetting.findUnique({
    where: {
      tenant_id_key: { tenant_id: tenantId, key: SHOP_PROVIDER_SETTING_KEY },
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
    return {};
  }
}

export async function resolveShopStripeCredentials(
  tenantId: string,
): Promise<ShopStripeCredentials | null> {
  const stored = await readStored(tenantId);
  if (stored.secret_key?.trim()) {
    return {
      secretKey: stored.secret_key.trim(),
      webhookSecret: stored.webhook_secret?.trim() ?? "",
      publishableKey: stored.publishable_key?.trim() ?? "",
      source: "tenant",
    };
  }
  const platformKey = config.shop.stripe.secretKey.trim();
  if (!platformKey) return null;
  return {
    secretKey: platformKey,
    webhookSecret: config.shop.stripe.webhookSecret.trim(),
    publishableKey: config.shop.stripe.publishableKey.trim(),
    source: "platform",
  };
}

export async function getShopProviderStatus(
  tenantId: string,
): Promise<ShopProviderStatus> {
  const credentials = await resolveShopStripeCredentials(tenantId);
  if (!credentials) {
    return {
      configured: false,
      source: "none",
      secret_hint: null,
      publishable_key_hint: null,
    };
  }
  return {
    configured: true,
    source: credentials.source,
    secret_hint: mask(credentials.secretKey),
    publishable_key_hint: mask(credentials.publishableKey),
  };
}

export async function updateShopProvider(
  tenantId: string,
  body: UpdateShopProviderBody,
): Promise<ShopProviderStatus> {
  if (body.secret_key !== undefined && !body.secret_key.trim()) {
    await prisma.tenantSetting.deleteMany({
      where: { tenant_id: tenantId, key: SHOP_PROVIDER_SETTING_KEY },
    });
    return getShopProviderStatus(tenantId);
  }
  const current = await readStored(tenantId);
  const next: StoredCredentials = {
    secret_key: body.secret_key?.trim() || current.secret_key,
    webhook_secret: body.webhook_secret?.trim() || current.webhook_secret,
    publishable_key: body.publishable_key?.trim() || current.publishable_key,
  };
  if (!next.secret_key?.trim()) {
    throw new ValidationError("shop.stripe_secret_required");
  }
  const secret = encryptTenantSecret(JSON.stringify(next));
  await prisma.tenantSetting.upsert({
    where: {
      tenant_id_key: { tenant_id: tenantId, key: SHOP_PROVIDER_SETTING_KEY },
    },
    create: {
      tenant_id: tenantId,
      key: SHOP_PROVIDER_SETTING_KEY,
      value: {},
      secret,
    },
    update: { secret },
  });
  return getShopProviderStatus(tenantId);
}

export async function getShopSetting(
  tenantId: string,
): Promise<ShopSettingView> {
  const row = await prisma.shopSetting.findUnique({
    where: { tenant_id: tenantId },
  });
  if (!row) {
    return {
      currency: "USD",
      origin_country: "CN",
      ioss_number: null,
      eori_number: null,
      stripe_tax_enabled: false,
    };
  }
  return {
    currency: row.currency,
    origin_country: row.origin_country,
    ioss_number: row.ioss_number,
    eori_number: row.eori_number,
    stripe_tax_enabled: row.stripe_tax_enabled,
  };
}

export async function updateShopSetting(
  tenantId: string,
  body: UpdateShopSettingBody,
): Promise<ShopSettingView> {
  const current = await getShopSetting(tenantId);
  const currency = body.currency
    ? normalizeCurrency(body.currency, current.currency)
    : current.currency;
  const origin =
    body.origin_country !== undefined
      ? normalizeCountry(body.origin_country)
      : current.origin_country;
  if (body.origin_country !== undefined && !origin) {
    throw new ValidationError("shop.country_invalid");
  }
  const row = await prisma.shopSetting.upsert({
    where: { tenant_id: tenantId },
    create: {
      tenant_id: tenantId,
      currency,
      origin_country: origin ?? "CN",
      ioss_number: body.ioss_number?.trim() || null,
      eori_number: body.eori_number?.trim() || null,
      stripe_tax_enabled: body.stripe_tax_enabled ?? false,
    },
    update: {
      ...(body.currency !== undefined ? { currency } : {}),
      ...(body.origin_country !== undefined
        ? { origin_country: origin ?? current.origin_country }
        : {}),
      ...(body.ioss_number !== undefined
        ? { ioss_number: body.ioss_number?.trim() || null }
        : {}),
      ...(body.eori_number !== undefined
        ? { eori_number: body.eori_number?.trim() || null }
        : {}),
      ...(body.stripe_tax_enabled !== undefined
        ? { stripe_tax_enabled: body.stripe_tax_enabled }
        : {}),
    },
  });
  return {
    currency: row.currency,
    origin_country: row.origin_country,
    ioss_number: row.ioss_number,
    eori_number: row.eori_number,
    stripe_tax_enabled: row.stripe_tax_enabled,
  };
}
