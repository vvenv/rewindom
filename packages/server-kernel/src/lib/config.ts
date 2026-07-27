/**
 * 服务器配置管理
 * 集中读取环境变量，提供类型安全的默认值
 */
import path from "path";
import { fileURLToPath } from "url";

import { config as dotenvConfig } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../../..");
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
    port: intEnv("PORT", 3400),
    host: strEnv("HOST", "0.0.0.0"),
    logLevel: strEnv("LOG_LEVEL", isProduction ? "warn" : "info"),
    workersEnabled: boolEnv("WORKERS_ENABLED", true),
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
    url: strEnv("FRONTEND_URL", isProduction ? "" : "http://localhost:5173"),
  },
  auth: buildAuthConfig(),
  database: buildDatabaseConfig(),
  storage: buildStorageConfig(),
  observability: buildObservabilityConfig(),
  infra: buildInfraConfig(),
  openai: buildOpenAiConfig(),
  tenant: {
    secretEncryptionKey: resolveTenantSecretEncryptionKey(),
    // 租户守卫：enforce 强制注入租户谓词；audit 只上报不改写（灰度用）；off 关闭。
    guardMode: resolveTenantGuardMode(),
  },
};

export type Config = typeof config;
