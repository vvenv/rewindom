/**
 * 服务器配置管理
 * 集中读取环境变量，提供类型安全的默认值
 */
import path from "path";

import { config as dotenvConfig } from "dotenv";

import { findMonorepoRoot } from "./monorepo-root.js";

const monorepoRoot = findMonorepoRoot();
dotenvConfig({ path: path.resolve(monorepoRoot, ".env") });
const devEnvFile = process.env.APP_ENV_FILE ?? ".env.local";
dotenvConfig({
  path: path.resolve(monorepoRoot, devEnvFile),
  override: true,
});

const nodeEnv = process.env.NODE_ENV;
const isProduction = nodeEnv === "production";
const isTest = process.env.VITEST === "true" || nodeEnv === "test";
const defaultExportBaseDir = isProduction
  ? "/var/www/app/storage/exports"
  : path.join(monorepoRoot, "data/exports");
const defaultAttachmentBaseDir = isProduction
  ? "/var/www/app/storage/attachments"
  : path.join(monorepoRoot, "data/attachments");

function strEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalStrEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

function intEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function clampIntEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, intEnv(name, fallback)));
}

/** 默认 true；仅当 env 显式设为 "false" 时为 false */
function boolEnv(name: string, defaultValue = true): boolean {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  return value !== "false";
}

function csvEnv(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const TENANT_SECRET_KEY_LENGTH = 32;
const TEST_TENANT_SECRET_KEY = Buffer.alloc(TENANT_SECRET_KEY_LENGTH, 0);

function parseTenantSecretEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  const decoded = Buffer.from(trimmed, "base64");
  if (decoded.length !== TENANT_SECRET_KEY_LENGTH) {
    throw new Error(
      "TENANT_SECRET_ENCRYPTION_KEY must be 32 bytes (hex or base64)",
    );
  }
  return decoded;
}

function resolveTenantSecretEncryptionKey(): Buffer {
  const raw = optionalStrEnv("TENANT_SECRET_ENCRYPTION_KEY");
  if (!raw) {
    if (isTest) {
      return TEST_TENANT_SECRET_KEY;
    }
    throw new Error("TENANT_SECRET_ENCRYPTION_KEY 未配置");
  }
  return parseTenantSecretEncryptionKey(raw);
}

function resolveJwtSecret(): string {
  const secret = optionalStrEnv("JWT_SECRET");
  if (secret) {
    return secret;
  }
  if (isProduction) {
    throw new Error("生产环境必须设置JWT_SECRET");
  }
  return "dev-secret-key-change-in-production";
}

function buildServerConfig() {
  return {
    isProduction,
    isTest,
    nodeEnv: nodeEnv ?? "development",
    port: intEnv("PORT", 3700),
    host: strEnv("HOST", "0.0.0.0"),
    logLevel: strEnv("LOG_LEVEL", isProduction ? "warn" : "info"),
    workersEnabled: boolEnv("WORKERS_ENABLED", true),
  };
}

function buildOAuthProviderConfig(
  envPrefix: "GITHUB" | "GOOGLE" | "MICROSOFT",
) {
  const clientId = optionalStrEnv(`${envPrefix}_CLIENT_ID`);
  const clientSecret = optionalStrEnv(`${envPrefix}_CLIENT_SECRET`);
  return {
    clientId: clientId ?? "",
    clientSecret: clientSecret ?? "",
    /** 可选覆盖；未设时优先 FRONTEND_URL，再回退请求 Host */
    callbackUrl: optionalStrEnv(`${envPrefix}_CALLBACK_URL`) ?? "",
    enabled: Boolean(clientId && clientSecret),
  };
}

function buildAuthConfig() {
  return {
    jwtSecret: resolveJwtSecret(),
    bcryptSaltRounds: isTest ? 4 : 10,
    platformAdmin: {
      username: strEnv("PLATFORM_ADMIN_USERNAME", ""),
      password: strEnv("PLATFORM_ADMIN_PASSWORD", ""),
      passwordHash: strEnv("PLATFORM_ADMIN_PASSWORD_HASH", ""),
    },
    github: buildOAuthProviderConfig("GITHUB"),
    google: buildOAuthProviderConfig("GOOGLE"),
    microsoft: {
      ...buildOAuthProviderConfig("MICROSOFT"),
      /** Entra 目录：`common` / `organizations` / `consumers` / 具体 tenant id */
      authority: strEnv("MICROSOFT_AUTHORITY", "common"),
    },
  };
}

/**
 * node-postgres treats sslmode=require as verify-full (rejects self-signed certs).
 * libpq require only enforces encryption — use uselibpqcompat for CVM self-signed SSL.
 * TencentDB with sslrootcert is left unchanged (verify-full + CA).
 */
export function normalizeDatabaseUrl(url: string): string {
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    return url;
  }
  try {
    const parsed = new URL(url);
    const sslmode = parsed.searchParams.get("sslmode");
    if (
      sslmode === "require" &&
      !parsed.searchParams.has("sslrootcert") &&
      parsed.searchParams.get("uselibpqcompat") !== "true"
    ) {
      parsed.searchParams.set("uselibpqcompat", "true");
      return parsed.toString();
    }
  } catch {
    // keep original on parse errors
  }
  return url;
}

function buildDatabaseConfig() {
  return {
    url: normalizeDatabaseUrl(strEnv("DATABASE_URL", "file:../../data/app.db")),
    backup: {
      /** pg_dump -Fc 压缩级别 0–9 */
      pgDumpCompressLevel: clampIntEnv("DATABASE_BACKUP_COMPRESS", 6, 0, 9),
    },
    restore: {
      /** pg_restore 并行 worker 数 */
      parallelJobs: Math.max(1, intEnv("DATABASE_RESTORE_JOBS", 4)),
      /** 浏览器上传还原单文件上限（字节） */
      maxUploadFileBytes: intEnv(
        "DATABASE_RESTORE_MAX_FILE_BYTES",
        10 * 1024 * 1024 * 1024,
      ),
      /** 允许本地路径还原的绝对目录（逗号分隔） */
      localPaths: csvEnv(
        "DATABASE_RESTORE_LOCAL_PATHS",
        "/backups,/var/backups/app",
      ),
    },
  };
}

function buildStorageConfig() {
  const exportBaseDir = strEnv("EXPORT_BASE_DIR", defaultExportBaseDir);
  const backupSubDir = strEnv("EXPORT_BACKUP_SUBDIR", "backups");
  const defaultBackupDir = path.join(exportBaseDir, backupSubDir);

  return {
    export: {
      baseDir: exportBaseDir,
      databaseBackup: {
        subDir: backupSubDir,
        dir: strEnv("DATABASE_BACKUP_DIR", defaultBackupDir),
      },
    },
    attachment: {
      storage: strEnv("ATTACHMENT_STORAGE", "local"),
      baseDir: strEnv("ATTACHMENT_BASE_DIR", defaultAttachmentBaseDir),
      /** S3 兼容后端（Cloudflare R2 / AWS S3 / MinIO）。`ATTACHMENT_STORAGE=s3|r2` 时必填。 */
      s3: {
        endpoint: optionalStrEnv("S3_ENDPOINT") ?? "",
        region: strEnv("S3_REGION", "auto"),
        bucket: strEnv("S3_BUCKET", ""),
        accessKeyId: optionalStrEnv("S3_ACCESS_KEY_ID") ?? "",
        secretAccessKey: optionalStrEnv("S3_SECRET_ACCESS_KEY") ?? "",
        publicBaseUrl: (optionalStrEnv("S3_PUBLIC_BASE_URL") ?? "").replace(
          /\/+$/,
          "",
        ),
      },
    },
  };
}

function buildObservabilityConfig() {
  return {
    errorLog: {
      enabled: boolEnv("ERROR_LOGGING_ENABLED", true),
      retentionDays: intEnv("ERROR_LOG_RETENTION_DAYS", 30),
      logLevel: strEnv("ERROR_LOG_LEVEL", "error"),
      includeRequestBody: boolEnv("ERROR_LOG_INCLUDE_REQUEST_BODY", true),
      includeRequestParams: boolEnv("ERROR_LOG_INCLUDE_REQUEST_PARAMS", true),
      includeRequestQuery: boolEnv("ERROR_LOG_INCLUDE_REQUEST_QUERY", true),
    },
    slowQuery: {
      enabled: boolEnv("SLOW_QUERY_ENABLED", isProduction),
      thresholdMs: intEnv("SLOW_QUERY_THRESHOLD_MS", 200),
      bufferSize: clampIntEnv("SLOW_QUERY_BUFFER_SIZE", 50, 10, 500),
      flushIntervalMs: clampIntEnv(
        "SLOW_QUERY_FLUSH_INTERVAL_MS",
        2000,
        500,
        30_000,
      ),
      paramsMaxLen: intEnv("SLOW_QUERY_PARAMS_MAX_LEN", 2000),
      retentionDays: intEnv("SLOW_QUERY_RETENTION_DAYS", 14),
    },
    slowRequest: {
      enabled: boolEnv("SLOW_REQUEST_ENABLED", true),
      thresholdMs: intEnv("SLOW_REQUEST_THRESHOLD_MS", 500),
      bufferSize: clampIntEnv("SLOW_REQUEST_BUFFER_SIZE", 50, 10, 500),
      flushIntervalMs: clampIntEnv(
        "SLOW_REQUEST_FLUSH_INTERVAL_MS",
        2000,
        500,
        30_000,
      ),
      retentionDays: intEnv("SLOW_REQUEST_RETENTION_DAYS", 14),
    },
  };
}

function buildInfraConfig() {
  return {
    redis: {
      host: strEnv("REDIS_HOST", "localhost"),
      port: intEnv("REDIS_PORT", 6379),
      password: optionalStrEnv("REDIS_PASSWORD"),
      db: intEnv("REDIS_DB", 0),
    },
    queue: {
      maxRetries: 5,
      retryDelay: 1000,
      backoffType: "exponential",
      removeOnComplete: {
        count: 1000,
        age: 24 * 60 * 60,
      },
      removeOnFail: {
        count: 5000,
        age: 7 * 24 * 60 * 60,
      },
    },
  };
}

/** LLM 接入（OpenAI 兼容接口）。上游不预设业务用途，由使用它的模块自行调用。 */
function buildOpenAiConfig() {
  return {
    baseUrl: strEnv("OPENAI_BASE_URL", "https://api.deepseek.com/v1"),
    apiKey: strEnv("OPENAI_API_KEY", ""),
    model: strEnv("OPENAI_MODEL", "deepseek-v4-flash"),
  };
}

/**
 * Embedding 接入（OpenAI 兼容 `/embeddings` 端点）。
 *
 * **与 `openai` 段分开是必须的，不是洁癖**：`OPENAI_BASE_URL` 现在指向 deepseek，
 * 而 deepseek 不提供 embeddings 端点。对话模型与向量模型是两个供应商，
 * 共用一组 env 会让其中一个必然拿到错的地址。
 *
 * 没配 key 时使用方一律退回无向量路径——不抛错，不阻塞。
 */
function buildEmbeddingsConfig() {
  return {
    baseUrl: strEnv("OPENAI_EMBEDDING_BASE_URL", ""),
    apiKey: strEnv("OPENAI_EMBEDDING_API_KEY", ""),
    model: strEnv("OPENAI_EMBEDDING_MODEL", ""),
    /** 供应商支持降维时传给接口；0 表示不指定，用模型默认维度。 */
    dimensions: clampIntEnv("OPENAI_EMBEDDING_DIMENSIONS", 0, 0, 8192),
  };
}

/**
 * 事件雷达（events 模块）的采集与分析开关。
 *
 * 放在内核 config 而不是模块内直读 `process.env`，是为了让 `check:prod-app-env`
 * 能盯住这几个键的生产透传——与 shop 的 stripe 段同理，内核只存 env 值，不含业务逻辑。
 */
function buildEventsConfig() {
  return {
    /** 关掉后调度器不再注册采集任务；只读已有语料。 */
    ingestEnabled: boolEnv("EVENTS_INGEST_ENABLED", true),
    ingestIntervalMinutes: clampIntEnv(
      "EVENTS_INGEST_INTERVAL_MINUTES",
      15,
      5,
      24 * 60,
    ),
    /** auto = 有 OPENAI_API_KEY 就走 LLM，否则走规则实现。 */
    analyzer: resolveEventsAnalyzer(),
    /**
     * 值得一次模型调用的最低信号数。
     *
     * 只有一条信号时 LLM 干的活退化成「给一篇文章换个说法」——而规则实现
     * 本来就把原标题与原摘录端上来了，差别只有文笔。实测语料里 98% 的事件
     * 终生只有一条信号，这道闸门就是省钱的大头。1 = 不设门槛（旧行为）。
     */
    llmMinSignals: clampIntEnv("EVENTS_LLM_MIN_SIGNALS", 2, 1, 50),
    /**
     * 每个站点每轮最多给热度前几名做 LLM 分析。
     *
     * 公开面只摆 Rising 5 + Now 10，排在后面的事件付了模型费也没人看。
     * 留出余量是因为热度每轮重算，事件升上来时要还来得及补分析。0 = 不限。
     */
    llmTopEvents: clampIntEnv("EVENTS_LLM_TOP_EVENTS", 30, 0, 10_000),
    /**
     * LLM 重分析的基础冷却（分钟）。事件越老、倍数越大——一个跑了两天、
     * 已有六条信号的事件，第七条带来的摘要变化基本为零。
     */
    llmCooldownMinutes: clampIntEnv("EVENTS_LLM_COOLDOWN_MINUTES", 30, 0, 24 * 60),
    /**
     * 语料保留期（天）。信号无上限增长是这个模块最早会撞上的墙——
     * 采集每 15 分钟按站点追加，从来没有回收路径。
     */
    signalRetentionDays: clampIntEnv("EVENTS_SIGNAL_RETENTION_DAYS", 90, 7, 3650),
    eventRetentionDays: clampIntEnv("EVENTS_EVENT_RETENTION_DAYS", 180, 7, 3650),
  };
}

function resolveEventsAnalyzer(): "auto" | "heuristic" | "llm" {
  const value = strEnv("EVENTS_ANALYZER", "auto").toLowerCase();
  if (value === "auto" || value === "heuristic" || value === "llm") {
    return value;
  }
  throw new Error(
    `EVENTS_ANALYZER 取值非法：${value}（可选 auto / heuristic / llm）`,
  );
}

function parseCreemProductMap(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("CREEM_PRODUCT_MAP 必须是 JSON 对象");
    }
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) {
        out[key] = value.trim();
      }
    }
    return out;
  } catch (err) {
    if (err instanceof Error && err.message.includes("CREEM_PRODUCT_MAP")) {
      throw err;
    }
    throw new Error("CREEM_PRODUCT_MAP 不是合法 JSON", { cause: err });
  }
}

function resolveCreemServer(): "test" | "prod" {
  const value = optionalStrEnv("CREEM_SERVER")?.toLowerCase();
  if (value === "test" || value === "prod") {
    return value;
  }
  return isProduction ? "prod" : "test";
}

function buildBillingConfig() {
  return {
    creem: {
      apiKey: strEnv("CREEM_API_KEY", ""),
      webhookSecret: strEnv("CREEM_WEBHOOK_SECRET", ""),
      storeId: strEnv("CREEM_STORE_ID", "sto_1xa3pu52PWClO5EruTHs86"),
      server: resolveCreemServer(),
      productMap: parseCreemProductMap(optionalStrEnv("CREEM_PRODUCT_MAP")),
    },
  };
}

function buildShopConfig() {
  return {
    stripe: {
      secretKey: strEnv("STRIPE_SECRET_KEY", ""),
      webhookSecret: strEnv("STRIPE_WEBHOOK_SECRET", ""),
      publishableKey: strEnv("STRIPE_PUBLISHABLE_KEY", ""),
    },
  };
}

function resolveTenantGuardMode(): "off" | "audit" | "enforce" {
  const value = strEnv("TENANT_GUARD_MODE", "enforce").toLowerCase();
  if (value === "off" || value === "audit" || value === "enforce") {
    return value;
  }
  throw new Error(
    `TENANT_GUARD_MODE 取值非法：${value}（可选 off / audit / enforce）`,
  );
}

export const config = {
  server: buildServerConfig(),
  frontend: {
    /** 产品站 / 默认租户前台（主域）。本地默认 localhost。 */
    url: strEnv("FRONTEND_URL", isProduction ? "" : "http://localhost:7300"),
  },
  platform: {
    /**
     * 平台控制台 origin（与产品站分离的 Host）。
     * 本地默认 127.0.0.1，与 FRONTEND_URL 的 localhost 区分，免改 /etc/hosts。
     */
    url: strEnv("PLATFORM_URL", isProduction ? "" : "http://127.0.0.1:7300"),
  },
  auth: buildAuthConfig(),
  database: buildDatabaseConfig(),
  storage: buildStorageConfig(),
  observability: buildObservabilityConfig(),
  infra: buildInfraConfig(),
  openai: buildOpenAiConfig(),
  embeddings: buildEmbeddingsConfig(),
  events: buildEventsConfig(),
  billing: buildBillingConfig(),
  shop: buildShopConfig(),
  tenant: {
    secretEncryptionKey: resolveTenantSecretEncryptionKey(),
    // 租户守卫：enforce 强制注入租户谓词；audit 只上报不改写（灰度用）；off 关闭。
    guardMode: resolveTenantGuardMode(),
    /**
     * 单租户部署：保留 Tenant 模型与隔离，但禁止新建租户；
     * 自助注册 / OAuth 首次登录一律加入默认租户。
     * env：`SINGLE_TENANT=true`（或任意非 `"false"` 值）；默认关闭。
     */
    singleTenant: boolEnv("SINGLE_TENANT", false),
    /**
     * 平台通配子域基域（如 `rewindom.com`）。
     * 配置后 `{slug}.{base}` 自动锁定对应租户；空则关闭。
     * env：`TENANT_BASE_DOMAIN`
     */
    baseDomain: strEnv("TENANT_BASE_DOMAIN", ""),
    /**
     * 宿主机 ACME helper（127.0.0.1）。空则平台「签发证书」不可用。
     * 生产 compose 默认 `http://host.docker.internal:9370`。
     */
    acmeHelperUrl: strEnv("ACME_HELPER_URL", ""),
    acmeHelperToken: strEnv("ACME_HELPER_TOKEN", ""),
  },
};

export type Config = typeof config;
