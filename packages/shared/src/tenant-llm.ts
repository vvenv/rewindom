/**
 * 租户 LLM（OpenAI 兼容）配置：设置 key、校验与 API 契约。
 *
 * 密钥本身只存在服务端 `TenantSetting.secret`；这里的类型是给设置页看的
 * **状态**（配没配、用的是谁的），不含明文。
 *
 * 解析顺序见 `docs/design/tenant-config.md` §6：TenantSetting > 平台 env。
 */

export const TENANT_SETTING_KEY_OPENAI = "openai_api_key";

export const LLM_DEFAULT_TEMPERATURE = 0.2;
export const LLM_TEMPERATURE_MIN = 0;
export const LLM_TEMPERATURE_MAX = 2;
export const LLM_MODEL_MAX_LENGTH = 100;

export type LlmConfigSource = "platform" | "tenant";

/** `TenantSetting.value`：非敏感覆盖。`null` = 该字段继承平台。 */
export interface TenantLlmPublicValue {
  model: string | null;
  temperature: number | null;
}

/**
 * `GET /api/settings/openai` —— **永不返回密钥本身**。
 *
 * `source` 是 API Key 的归属：本站自带还是回落到平台默认。模型 / 温度各自
 * 有 `*_source`，因为可以只覆盖其中一项。
 */
export interface TenantLlmStatus {
  configured: boolean;
  source: LlmConfigSource;
  api_key_hint: string | null;
  model: string | null;
  resolved_model: string;
  model_source: LlmConfigSource;
  temperature: number | null;
  resolved_temperature: number;
  temperature_source: LlmConfigSource;
}

/**
 * `PUT /api/settings/openai`
 *
 * - `api_key` 省略 = 不改密钥；空串 = 清掉本站密钥、回落平台
 * - `model` / `temperature` 省略 = 不改；`null` 或空串 = 恢复继承
 */
export interface TenantLlmWriteBody {
  api_key?: string;
  model?: string | null;
  temperature?: number | null;
}

export function parseLlmModel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, LLM_MODEL_MAX_LENGTH);
}

export function parseLlmTemperature(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) return null;
  if (value < LLM_TEMPERATURE_MIN || value > LLM_TEMPERATURE_MAX) {
    return null;
  }
  return value;
}

export function parseTenantLlmPublicValue(
  raw: unknown,
): TenantLlmPublicValue {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { model: null, temperature: null };
  }
  const record = raw as Record<string, unknown>;
  return {
    model: parseLlmModel(record.model),
    temperature: parseLlmTemperature(record.temperature),
  };
}

/** 尾部片段：够认出「填的是哪一把」，又不足以拿去用。 */
export function maskApiKeyHint(apiKey: string): string | null {
  const trimmed = apiKey.trim();
  if (!trimmed) return null;
  return `…${trimmed.slice(-4)}`;
}
