/**
 * 租户翻译配置：`TenantSetting` 存取 + 归一化。
 *
 * API key 存加密列 `secret`（与 `tenant-llm.ts` 同一套 `tenant-secret-crypto`），
 * **任何接口都不回明文**。公开面拿到的 `PublicTranslationConfig` 连端点都不含
 * ——要 key 的引擎连端点一起留在服务端，浏览器只知道「调代理」。
 */

import { Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import {
  decryptTenantSecret,
  encryptTenantSecret,
} from "@rewindom/server-kernel/lib/tenant-secret-crypto.js";
import { maskApiKeyHint } from "@rewindom/shared";

import {
  DEFAULT_TRANSLATION_ENGINE,
  TENANT_SETTING_KEY_TRANSLATION,
  defaultTranslationConfig,
  defaultTranslationTargets,
  engineNeedsProxy,
  isTranslationEngine,
  type PublicTranslationConfig,
  type TranslationEngine,
  type TranslationStatus,
  type TranslationWriteBody,
} from "../shared/translation.js";

/** 租户自定义术语表的上限：这张表每次翻译都要编译成正则，不能无限长。 */
const MAX_KEEP_TERMS = 200;
const MAX_TERM_LENGTH = 80;

interface StoredValue {
  enabled: boolean;
  engine: TranslationEngine;
  endpoint: string | null;
  targets: string[];
  keep_terms: string[];
}

function parseStoredValue(raw: unknown): StoredValue {
  const source = (raw ?? {}) as Record<string, unknown>;
  const engine = isTranslationEngine(source.engine)
    ? source.engine
    : DEFAULT_TRANSLATION_ENGINE;
  return {
    enabled: source.enabled === true,
    engine,
    endpoint: typeof source.endpoint === "string" ? source.endpoint : null,
    targets: Array.isArray(source.targets)
      ? source.targets.filter((item): item is string => typeof item === "string")
      : defaultTranslationTargets(),
    keep_terms: Array.isArray(source.keep_terms)
      ? source.keep_terms.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}

interface StoredRow {
  value: StoredValue;
  apiKey: string | null;
}

async function readStored(tenantId: string): Promise<StoredRow> {
  try {
    const row = await prisma.tenantSetting.findUnique({
      where: {
        tenant_id_key: {
          tenant_id: tenantId,
          key: TENANT_SETTING_KEY_TRANSLATION,
        },
      },
      select: { value: true, secret: true },
    });
    return {
      value: parseStoredValue(row?.value),
      apiKey: decryptStored(row?.secret),
    };
  } catch (err) {
    // 表还没建（全新库跑到公开面）时当作没配，不要 500 掉整张公开页
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2021"
    ) {
      return { value: parseStoredValue(null), apiKey: null };
    }
    throw err;
  }
}

function decryptStored(cipher: string | null | undefined): string | null {
  const trimmed = cipher?.trim();
  if (!trimmed) return null;
  try {
    return decryptTenantSecret(trimmed).trim() || null;
  } catch {
    // 换过 TENANT_SECRET_ENCRYPTION_KEY 就解不开，当作没配
    return null;
  }
}

function normalizeEndpoint(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    // 只收 http(s)：javascript: 这类会被 enhance 直接 fetch
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function normalizeKeepTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const term = item.trim().slice(0, MAX_TERM_LENGTH);
    if (term) seen.add(term);
    if (seen.size >= MAX_KEEP_TERMS) break;
  }
  return [...seen];
}

function normalizeTargets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return defaultTranslationTargets();
  const list = raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? [...new Set(list)] : defaultTranslationTargets();
}

function toPublicConfig(
  stored: StoredValue,
  hasApiKey: boolean,
): PublicTranslationConfig {
  const proxy = engineNeedsProxy(stored.engine);
  return {
    /*
     * 要 key 的引擎没配 key 就等于没开——公开面拿到 enabled:true 却每次调用
     * 都 502，比直接不显示翻译按钮更糟。
     */
    enabled: stored.enabled && (!proxy || hasApiKey),
    engine: stored.engine,
    // 端点只对直连引擎下发；代理引擎的端点是服务端的事
    endpoint: proxy ? null : stored.endpoint,
    proxy,
    targets: stored.targets,
    keep_terms: stored.keep_terms,
  };
}

/**
 * 公开面用：无鉴权可读，因此**只含**浏览器该知道的字段。
 *
 * `contributedTerms` 是各业务模块通过 `TranslationTermsProvider` 供的专有名词
 *（events 的实体索引等）。与租户手填的术语合并后一起下发——两者都要在浏览器里
 * 参与遮罩，服务端留着没用。
 */
export async function getPublicTranslationConfig(
  tenantId: string,
  contributedTerms: readonly string[] = [],
): Promise<PublicTranslationConfig> {
  const stored = await readStored(tenantId);
  const config = toPublicConfig(stored.value, stored.apiKey !== null);
  return {
    ...config,
    keep_terms: mergeKeepTerms(config.keep_terms, contributedTerms),
  };
}

/**
 * 合并术语表并封顶。
 *
 * **租户手填的优先**：那是人明确指定的，模块自动供的只是补充。超出上限时砍掉的
 * 是后者——术语表每多一条就多一个正则要在每段文本上跑，无限长会把翻译拖垮。
 */
export function mergeKeepTerms(
  tenantTerms: readonly string[],
  contributedTerms: readonly string[],
): string[] {
  const seen = new Set<string>();
  for (const term of [...tenantTerms, ...contributedTerms]) {
    const trimmed = term.trim();
    // 一个字符的「术语」会命中满篇，反而毁掉译文
    if (trimmed.length < 2 || trimmed.length > MAX_TERM_LENGTH) continue;
    seen.add(trimmed);
    if (seen.size >= MAX_KEEP_TERMS) break;
  }
  return [...seen];
}

/** 工作台设置页用：多一个 key 掩码。 */
export async function getTranslationStatus(
  tenantId: string,
): Promise<TranslationStatus> {
  const stored = await readStored(tenantId);
  return {
    ...toPublicConfig(stored.value, stored.apiKey !== null),
    // 设置页要看到自己配的端点，哪怕它不下发给浏览器
    endpoint: stored.value.endpoint,
    api_key_hint: stored.apiKey ? maskApiKeyHint(stored.apiKey) : null,
    has_api_key: stored.apiKey !== null,
  };
}

/** 服务端代理用：唯一会拿到明文 key 的入口。 */
export async function resolveTranslationSecret(tenantId: string): Promise<{
  engine: TranslationEngine;
  endpoint: string | null;
  apiKey: string | null;
  enabled: boolean;
  keepTerms: string[];
} | null> {
  const stored = await readStored(tenantId);
  if (!stored.value.enabled) return null;
  return {
    engine: stored.value.engine,
    endpoint: stored.value.endpoint,
    apiKey: stored.apiKey,
    enabled: stored.value.enabled,
    keepTerms: stored.value.keep_terms,
  };
}

export async function updateTranslationConfig(
  tenantId: string,
  body: TranslationWriteBody,
): Promise<TranslationStatus> {
  const stored = await readStored(tenantId);
  const next: StoredValue = {
    enabled: body.enabled ?? stored.value.enabled,
    engine: isTranslationEngine(body.engine) ? body.engine : stored.value.engine,
    endpoint:
      body.endpoint === undefined
        ? stored.value.endpoint
        : normalizeEndpoint(body.endpoint),
    targets:
      body.targets === undefined
        ? stored.value.targets
        : normalizeTargets(body.targets),
    keep_terms:
      body.keep_terms === undefined
        ? stored.value.keep_terms
        : normalizeKeepTerms(body.keep_terms),
  };

  /** `undefined` = 不改；空串 = 清掉。与 `tenant-llm` 的 `api_key` 同一口径。 */
  const secret =
    body.api_key === undefined
      ? undefined
      : body.api_key?.trim()
        ? encryptTenantSecret(body.api_key.trim())
        : null;

  await prisma.tenantSetting.upsert({
    where: {
      tenant_id_key: {
        tenant_id: tenantId,
        key: TENANT_SETTING_KEY_TRANSLATION,
      },
    },
    create: {
      tenant_id: tenantId,
      key: TENANT_SETTING_KEY_TRANSLATION,
      value: next as unknown as Prisma.InputJsonValue,
      ...(secret !== undefined ? { secret } : {}),
    },
    update: {
      value: next as unknown as Prisma.InputJsonValue,
      ...(secret !== undefined ? { secret } : {}),
    },
  });

  return getTranslationStatus(tenantId);
}

export { defaultTranslationConfig };
