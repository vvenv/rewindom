/**
 * 租户 LLM 配置：TenantSetting 加密存储 + 运行时解析。
 *
 * 优先级：本站覆盖 > 平台 env。`OPENAI_BASE_URL` 故意不开放给租户——
 * 换 endpoint 是部署决策，不是设置页上的一项。
 *
 * 任何接口都不要把 `apiKey` 回给浏览器；设置页走 `getTenantLlmStatus`。
 */
import {
  LLM_DEFAULT_TEMPERATURE,
  LLM_MODEL_MAX_LENGTH,
  TENANT_SETTING_KEY_OPENAI,
  maskApiKeyHint,
  parseLlmModel,
  parseLlmTemperature,
  parseTenantLlmPublicValue,
  type TenantLlmPublicValue,
  type TenantLlmStatus,
  type TenantLlmWriteBody,
} from "@rewindom/shared";

import { Prisma } from "../generated/prisma/client/client.js";

import { ValidationError } from "./app-errors.js";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import {
  decryptTenantSecret,
  encryptTenantSecret,
} from "./tenant-secret-crypto.js";

export interface ResolvedLlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  api_key_source: TenantLlmStatus["source"];
  model_source: TenantLlmStatus["model_source"];
  temperature_source: TenantLlmStatus["temperature_source"];
}

interface StoredLlmRow {
  apiKey: string | null;
  publicValue: TenantLlmPublicValue;
}

async function readStored(tenantId: string): Promise<StoredLlmRow> {
  try {
    const row = await prisma.tenantSetting.findUnique({
      where: {
        tenant_id_key: {
          tenant_id: tenantId,
          key: TENANT_SETTING_KEY_OPENAI,
        },
      },
      select: { secret: true, value: true },
    });
    return {
      apiKey: decryptStoredKey(row?.secret),
      publicValue: parseTenantLlmPublicValue(row?.value),
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2021"
    ) {
      return { apiKey: null, publicValue: { model: null, temperature: null } };
    }
    throw err;
  }
}

function decryptStoredKey(cipher: string | null | undefined): string | null {
  const trimmed = cipher?.trim();
  if (!trimmed) return null;
  try {
    const plaintext = decryptTenantSecret(trimmed).trim();
    return plaintext || null;
  } catch {
    // 解不开就当没配（换过 TENANT_SECRET_ENCRYPTION_KEY 会走到这里）
    return null;
  }
}

export async function resolveLlmConfig(
  tenantId: string,
): Promise<ResolvedLlmConfig> {
  const stored = await readStored(tenantId);
  const platformKey = config.openai.apiKey.trim();
  const platformModel = config.openai.model.trim();
  const tenantKey = stored.apiKey;
  const tenantModel = stored.publicValue.model;
  const tenantTemperature = stored.publicValue.temperature;

  return {
    apiKey: tenantKey || platformKey,
    baseUrl: config.openai.baseUrl,
    model: tenantModel || platformModel,
    temperature: tenantTemperature ?? LLM_DEFAULT_TEMPERATURE,
    api_key_source: tenantKey ? "tenant" : "platform",
    model_source: tenantModel ? "tenant" : "platform",
    temperature_source:
      tenantTemperature !== null ? "tenant" : "platform",
  };
}

export async function getTenantLlmStatus(
  tenantId: string,
): Promise<TenantLlmStatus> {
  const resolved = await resolveLlmConfig(tenantId);
  return {
    configured: Boolean(resolved.apiKey),
    source: resolved.api_key_source,
    api_key_hint: maskApiKeyHint(resolved.apiKey),
    model:
      resolved.model_source === "tenant" ? resolved.model : null,
    resolved_model: resolved.model,
    model_source: resolved.model_source,
    temperature:
      resolved.temperature_source === "tenant"
        ? resolved.temperature
        : null,
    resolved_temperature: resolved.temperature,
    temperature_source: resolved.temperature_source,
  };
}

export async function updateTenantLlmConfig(
  tenantId: string,
  body: TenantLlmWriteBody,
): Promise<TenantLlmStatus> {
  const stored = await readStored(tenantId);
  const nextKey = nextApiKey(stored.apiKey, body.api_key);
  const nextPublic = nextPublicValue(stored.publicValue, body);

  if (!nextKey && nextPublic.model === null && nextPublic.temperature === null) {
    await prisma.tenantSetting.deleteMany({
      where: { tenant_id: tenantId, key: TENANT_SETTING_KEY_OPENAI },
    });
    return getTenantLlmStatus(tenantId);
  }

  await prisma.tenantSetting.upsert({
    where: {
      tenant_id_key: {
        tenant_id: tenantId,
        key: TENANT_SETTING_KEY_OPENAI,
      },
    },
    create: {
      tenant_id: tenantId,
      key: TENANT_SETTING_KEY_OPENAI,
      value: nextPublic as unknown as Prisma.InputJsonValue,
      secret: nextKey ? encryptTenantSecret(nextKey) : null,
    },
    update: {
      value: nextPublic as unknown as Prisma.InputJsonValue,
      secret: nextKey ? encryptTenantSecret(nextKey) : null,
    },
  });

  return getTenantLlmStatus(tenantId);
}

function nextApiKey(
  stored: string | null,
  incoming: string | undefined,
): string | null {
  if (incoming === undefined) return stored;
  const trimmed = incoming.trim();
  return trimmed || null;
}

function nextPublicValue(
  stored: TenantLlmPublicValue,
  body: TenantLlmWriteBody,
): TenantLlmPublicValue {
  return {
    model:
      body.model === undefined
        ? stored.model
        : parseRequiredModel(body.model),
    temperature:
      body.temperature === undefined
        ? stored.temperature
        : parseRequiredTemperature(body.temperature),
  };
}

function parseRequiredModel(raw: string | null): string | null {
  if (raw === null) return null;
  if (typeof raw !== "string") {
    throw new ValidationError("openai.model_invalid");
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > LLM_MODEL_MAX_LENGTH) {
    throw new ValidationError("openai.model_too_long");
  }
  return parseLlmModel(trimmed);
}

function parseRequiredTemperature(raw: number | null): number | null {
  if (raw === null) return null;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new ValidationError("openai.temperature_invalid");
  }
  const parsed = parseLlmTemperature(raw);
  if (parsed === null) {
    throw new ValidationError("openai.temperature_invalid");
  }
  return parsed;
}
