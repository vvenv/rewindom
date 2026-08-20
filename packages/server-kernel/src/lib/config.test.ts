import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dotenv 阻止加载真实 .env 文件
vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

describe("config", () => {
  const envKeys = [
    "PORT",
    "HOST",
    "LOG_LEVEL",
    "FRONTEND_URL",
    "PLATFORM_URL",
    "JWT_SECRET",
    "PLATFORM_ADMIN_USERNAME",
    "PLATFORM_ADMIN_PASSWORD",
    "PLATFORM_ADMIN_PASSWORD_HASH",
    "DATABASE_URL",
    "DATABASE_BACKUP_COMPRESS",
    "DATABASE_RESTORE_JOBS",
    "DATABASE_RESTORE_MAX_FILE_BYTES",
    "DATABASE_RESTORE_LOCAL_PATHS",
    "ERROR_LOGGING_ENABLED",
    "ERROR_LOG_RETENTION_DAYS",
    "ERROR_LOG_LEVEL",
    "ERROR_LOG_INCLUDE_REQUEST_BODY",
    "ERROR_LOG_INCLUDE_REQUEST_PARAMS",
    "ERROR_LOG_INCLUDE_REQUEST_QUERY",
    "REDIS_HOST",
    "REDIS_PORT",
    "REDIS_PASSWORD",
    "REDIS_DB",
    "DATABASE_BACKUP_DIR",
    "EXPORT_BASE_DIR",
    "EXPORT_BACKUP_SUBDIR",
    "ATTACHMENT_STORAGE",
    "ATTACHMENT_BASE_DIR",
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_PUBLIC_BASE_URL",
    "WORKERS_ENABLED",
    "TENANT_SECRET_ENCRYPTION_KEY",
    "OPENAI_BASE_URL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "EVENTS_INGEST_ENABLED",
    "EVENTS_INGEST_INTERVAL_MINUTES",
    "EVENTS_ANALYZER",
    "EVENTS_LLM_MIN_SIGNALS",
    "EVENTS_LLM_TOP_EVENTS",
    "EVENTS_LLM_COOLDOWN_MINUTES",
    "EVENTS_SIGNAL_RETENTION_DAYS",
    "EVENTS_EVENT_RETENTION_DAYS",
  ];

  beforeEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
    process.env.VITEST = "true";
    process.env.NODE_ENV = "test";
  });

  async function importConfig() {
    vi.resetModules();
    return import("./config.js");
  }

  describe("server", () => {
    it("开发模式使用默认值", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.server.port).toBe(3700);
      expect(cfg.server.host).toBe("0.0.0.0");
      expect(cfg.server.logLevel).toBe("info");
      expect(cfg.server.isProduction).toBe(false);
      expect(cfg.server.workersEnabled).toBe(true);
    });

    it("生产模式 logLevel 默认 warn", async () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "test-prod-secret";
      const { config: cfg } = await importConfig();
      expect(cfg.server.isProduction).toBe(true);
      expect(cfg.server.logLevel).toBe("warn");
    });

    it("可通过环境变量覆盖 server 配置", async () => {
      process.env.PORT = "8080";
      process.env.HOST = "127.0.0.1";
      process.env.LOG_LEVEL = "debug";
      const { config: cfg } = await importConfig();
      expect(cfg.server.port).toBe(8080);
      expect(cfg.server.host).toBe("127.0.0.1");
      expect(cfg.server.logLevel).toBe("debug");
    });

    it("WORKERS_ENABLED=false 可关闭", async () => {
      process.env.WORKERS_ENABLED = "false";
      const { config: cfg } = await importConfig();
      expect(cfg.server.workersEnabled).toBe(false);
    });
  });

  describe("frontend / platform", () => {
    it("开发模式默认 localhost 产品站与 127.0.0.1 控制台", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.frontend.url).toBe("http://localhost:7300");
      expect(cfg.platform.url).toBe("http://127.0.0.1:7300");
    });

    it("生产模式默认空字符串", async () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "test-prod-secret";
      const { config: cfg } = await importConfig();
      expect(cfg.frontend.url).toBe("");
      expect(cfg.platform.url).toBe("");
    });
  });

  describe("auth", () => {
    it("开发模式使用默认 JWT secret", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.auth.jwtSecret).toBe("dev-secret-key-change-in-production");
    });

    it("生产模式缺少 JWT_SECRET 抛出错误", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.JWT_SECRET;
      await expect(importConfig()).rejects.toThrow(
        "生产环境必须设置JWT_SECRET",
      );
    });

    it("生产模式使用自定义 JWT_SECRET", async () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "my-prod-secret";
      const { config: cfg } = await importConfig();
      expect(cfg.auth.jwtSecret).toBe("my-prod-secret");
    });

    it("平台管理员配置默认为空字符串", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.auth.platformAdmin.username).toBe("");
      expect(cfg.auth.platformAdmin.password).toBe("");
      expect(cfg.auth.platformAdmin.passwordHash).toBe("");
    });

    it("可通过环境变量覆盖平台管理员配置", async () => {
      process.env.PLATFORM_ADMIN_USERNAME = "admin";
      process.env.PLATFORM_ADMIN_PASSWORD = "pass123";
      process.env.PLATFORM_ADMIN_PASSWORD_HASH = "hash456";
      const { config: cfg } = await importConfig();
      expect(cfg.auth.platformAdmin.username).toBe("admin");
      expect(cfg.auth.platformAdmin.password).toBe("pass123");
      expect(cfg.auth.platformAdmin.passwordHash).toBe("hash456");
    });

    it("非测试环境 bcrypt rounds 为 10", async () => {
      delete process.env.VITEST;
      process.env.NODE_ENV = "development";
      process.env.TENANT_SECRET_ENCRYPTION_KEY =
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const { config: cfg } = await importConfig();
      expect(cfg.auth.bcryptSaltRounds).toBe(10);
    });

    it("测试环境 bcrypt rounds 为 4", async () => {
      process.env.VITEST = "true";
      const { config: cfg } = await importConfig();
      expect(cfg.auth.bcryptSaltRounds).toBe(4);
    });
  });

  describe("database", () => {
    it("使用默认数据库 URL", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.database.url).toBe("file:../../data/app.db");
    });

    it("sslmode=require 自动加 uselibpqcompat（自建自签证书）", async () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@db.example.com:5432/app?sslmode=require";
      const { config: cfg } = await importConfig();
      expect(cfg.database.url).toBe(
        "postgresql://user:pass@db.example.com:5432/app?sslmode=require&uselibpqcompat=true",
      );
    });

    it("含 sslrootcert 的 URL 不修改（TencentDB verify-full）", async () => {
      const tencentUrl =
        "postgresql://user:pass@db.example.com:5432/app?sslmode=verify-full&sslrootcert=/certs/ca.pem";
      process.env.DATABASE_URL = tencentUrl;
      const { config: cfg } = await importConfig();
      expect(cfg.database.url).toBe(tencentUrl);
    });

    it("backup 压缩级别默认 6，范围 0-9", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.database.backup.pgDumpCompressLevel).toBe(6);
    });

    it("backup 压缩级别 clamp 到有效范围", async () => {
      process.env.DATABASE_BACKUP_COMPRESS = "99";
      const { config: cfg } = await importConfig();
      expect(cfg.database.backup.pgDumpCompressLevel).toBe(9);

      await vi.resetModules();
      process.env.DATABASE_BACKUP_COMPRESS = "-5";
      const { config: cfg2 } = await importConfig();
      expect(cfg2.database.backup.pgDumpCompressLevel).toBe(0);
    });

    it("restore 配置有合理默认值", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.database.restore.parallelJobs).toBe(4);
      expect(cfg.database.restore.maxUploadFileBytes).toBe(
        10 * 1024 * 1024 * 1024,
      );
      expect(cfg.database.restore.localPaths).toEqual([
        "/backups",
        "/var/backups/app",
      ]);
    });

    it("restore localPaths 支持自定义逗号分隔路径", async () => {
      process.env.DATABASE_RESTORE_LOCAL_PATHS = "/a,/b,/c";
      const { config: cfg } = await importConfig();
      expect(cfg.database.restore.localPaths).toEqual(["/a", "/b", "/c"]);
    });
  });

  describe("storage", () => {
    it("backup 目录默认 data/exports/backups（开发模式）", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.storage.export.databaseBackup.dir).toContain(
        "data/exports/backups",
      );
    });

    it("attachment 默认 local 存储", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.storage.attachment.storage).toBe("local");
      expect(cfg.storage.attachment.baseDir).toContain("data/attachments");
      expect(cfg.storage.attachment.s3.region).toBe("auto");
      expect(cfg.storage.attachment.s3.bucket).toBe("");
      expect(cfg.storage.attachment.s3.publicBaseUrl).toBe("");
    });

    it("可通过 S3_* 覆盖对象存储配置并去掉 public URL 尾斜杠", async () => {
      process.env.ATTACHMENT_STORAGE = "r2";
      process.env.S3_ENDPOINT = "https://abc.r2.cloudflarestorage.com";
      process.env.S3_REGION = "auto";
      process.env.S3_BUCKET = "rewindom-attachments";
      process.env.S3_ACCESS_KEY_ID = "ak";
      process.env.S3_SECRET_ACCESS_KEY = "sk";
      process.env.S3_PUBLIC_BASE_URL = "https://media.example.com/";
      const { config: cfg } = await importConfig();
      expect(cfg.storage.attachment.storage).toBe("r2");
      expect(cfg.storage.attachment.s3).toEqual({
        endpoint: "https://abc.r2.cloudflarestorage.com",
        region: "auto",
        bucket: "rewindom-attachments",
        accessKeyId: "ak",
        secretAccessKey: "sk",
        publicBaseUrl: "https://media.example.com",
      });
    });

    it("可通过 DATABASE_BACKUP_DIR 覆盖备份目录", async () => {
      process.env.DATABASE_BACKUP_DIR = "/custom/backups";
      const { config: cfg } = await importConfig();
      expect(cfg.storage.export.databaseBackup.dir).toBe("/custom/backups");
    });
  });

  describe("observability", () => {
    it("errorLog 默认启用且包含请求信息", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.observability.errorLog.enabled).toBe(true);
      expect(cfg.observability.errorLog.retentionDays).toBe(30);
      expect(cfg.observability.errorLog.logLevel).toBe("error");
      expect(cfg.observability.errorLog.includeRequestBody).toBe(true);
      expect(cfg.observability.errorLog.includeRequestParams).toBe(true);
      expect(cfg.observability.errorLog.includeRequestQuery).toBe(true);
    });

    it("ERROR_LOGGING_ENABLED 设为 false 可关闭", async () => {
      process.env.ERROR_LOGGING_ENABLED = "false";
      const { config: cfg } = await importConfig();
      expect(cfg.observability.errorLog.enabled).toBe(false);
    });
  });

  describe("infra", () => {
    it("redis 使用默认连接参数", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.infra.redis.host).toBe("localhost");
      expect(cfg.infra.redis.port).toBe(6379);
      expect(cfg.infra.redis.password).toBeUndefined();
      expect(cfg.infra.redis.db).toBe(0);
    });

    it("redis 可通过环境变量覆盖", async () => {
      process.env.REDIS_HOST = "redis.example.com";
      process.env.REDIS_PORT = "6380";
      process.env.REDIS_PASSWORD = "secret";
      process.env.REDIS_DB = "2";
      const { config: cfg } = await importConfig();
      expect(cfg.infra.redis.host).toBe("redis.example.com");
      expect(cfg.infra.redis.port).toBe(6380);
      expect(cfg.infra.redis.password).toBe("secret");
      expect(cfg.infra.redis.db).toBe(2);
    });

    it("queue 有固定的策略配置", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.infra.queue.maxRetries).toBe(5);
      expect(cfg.infra.queue.retryDelay).toBe(1000);
      expect(cfg.infra.queue.backoffType).toBe("exponential");
      expect(cfg.infra.queue.removeOnComplete.count).toBe(1000);
      expect(cfg.infra.queue.removeOnFail.count).toBe(5000);
    });
  });

  describe("openai", () => {
    it("使用默认 LLM 配置", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.openai.baseUrl).toBe("https://api.deepseek.com/v1");
      expect(cfg.openai.apiKey).toBe("");
      expect(cfg.openai.model).toBe("deepseek-v4-flash");
    });

    it("可通过环境变量覆盖 LLM 配置", async () => {
      process.env.OPENAI_BASE_URL = "https://api.deepseek.com";
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.OPENAI_MODEL = "deepseek-chat";
      const { config: cfg } = await importConfig();
      expect(cfg.openai.baseUrl).toBe("https://api.deepseek.com");
      expect(cfg.openai.apiKey).toBe("sk-test");
      expect(cfg.openai.model).toBe("deepseek-chat");
    });
  });

  describe("events", () => {
    it("省钱闸门与采集周期有安全默认值", async () => {
      const { config: cfg } = await importConfig();
      expect(cfg.events.analyzer).toBe("auto");
      expect(cfg.events.ingestEnabled).toBe(true);
      expect(cfg.events.ingestIntervalMinutes).toBe(15);
      expect(cfg.events.llmMinSignals).toBe(2);
      expect(cfg.events.llmTopEvents).toBe(30);
      expect(cfg.events.llmCooldownMinutes).toBe(30);
    });

    it("Compose 透传的空字符串不关掉三道闸门", async () => {
      process.env.EVENTS_ANALYZER = "";
      process.env.EVENTS_LLM_MIN_SIGNALS = "";
      process.env.EVENTS_LLM_TOP_EVENTS = "";
      process.env.EVENTS_LLM_COOLDOWN_MINUTES = "";
      process.env.EVENTS_INGEST_INTERVAL_MINUTES = "";
      const { config: cfg } = await importConfig();
      expect(cfg.events.analyzer).toBe("auto");
      expect(cfg.events.llmMinSignals).toBe(2);
      expect(cfg.events.llmTopEvents).toBe(30);
      expect(cfg.events.llmCooldownMinutes).toBe(30);
      expect(cfg.events.ingestIntervalMinutes).toBe(15);
    });

    it("可显式关掉闸门（0 / 1 仍是合法值）", async () => {
      process.env.EVENTS_LLM_MIN_SIGNALS = "1";
      process.env.EVENTS_LLM_TOP_EVENTS = "0";
      process.env.EVENTS_LLM_COOLDOWN_MINUTES = "0";
      const { config: cfg } = await importConfig();
      expect(cfg.events.llmMinSignals).toBe(1);
      expect(cfg.events.llmTopEvents).toBe(0);
      expect(cfg.events.llmCooldownMinutes).toBe(0);
    });
  });

  describe("tenant", () => {
    it("测试环境使用 fallback 密钥", async () => {
      process.env.VITEST = "true";
      const { config: cfg } = await importConfig();
      expect(cfg.tenant.secretEncryptionKey).toEqual(Buffer.alloc(32, 0));
    });

    it("非测试环境缺少密钥抛出错误", async () => {
      delete process.env.VITEST;
      process.env.NODE_ENV = "development";
      await expect(importConfig()).rejects.toThrow(
        "TENANT_SECRET_ENCRYPTION_KEY 未配置",
      );
    });
  });

  describe("辅助函数行为", () => {
    it("intEnv 对非数字值返回 fallback", async () => {
      process.env.PORT = "abc";
      const { config: cfg } = await importConfig();
      expect(cfg.server.port).toBe(3700);
    });

    it("intEnv 把空字符串当未设置，不把 Number(\"\") 当成 0", async () => {
      process.env.PORT = "";
      const { config: cfg } = await importConfig();
      expect(cfg.server.port).toBe(3700);
    });

    it("boolEnv 默认 true，仅显式 false 为 false", async () => {
      let { config: cfg } = await importConfig();
      expect(cfg.observability.errorLog.enabled).toBe(true);

      await vi.resetModules();
      process.env.ERROR_LOGGING_ENABLED = "false";
      ({ config: cfg } = await importConfig());
      expect(cfg.observability.errorLog.enabled).toBe(false);

      await vi.resetModules();
      process.env.ERROR_LOGGING_ENABLED = "true";
      ({ config: cfg } = await importConfig());
      expect(cfg.observability.errorLog.enabled).toBe(true);

      await vi.resetModules();
      process.env.ERROR_LOGGING_ENABLED = "random";
      ({ config: cfg } = await importConfig());
      expect(cfg.observability.errorLog.enabled).toBe(true);
    });

    it("csvEnv 解析逗号分隔并去空格", async () => {
      process.env.DATABASE_RESTORE_LOCAL_PATHS = " /a , /b , /c ";
      const { config: cfg } = await importConfig();
      expect(cfg.database.restore.localPaths).toEqual(["/a", "/b", "/c"]);
    });

    it("optionalStrEnv 空字符串返回 undefined", async () => {
      process.env.REDIS_PASSWORD = "";
      const { config: cfg } = await importConfig();
      expect(cfg.infra.redis.password).toBeUndefined();
    });
  });
});
