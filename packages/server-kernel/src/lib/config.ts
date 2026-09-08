/**
 * 服务器配置管理
 * 集中读取环境变量，提供类型安全的默认值
 */
import path from "path";

import { config as dotenvConfig } from "dotenv";

import { findMonorepoRoot } from "./monorepo-root.js";
import { CLOUDFLARE_PROXY_RANGES } from "./proxy-ranges.js";

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

/**
 * 读整数环境变量。未设置、空串、纯空白都走 fallback。
 *
 * Compose 里 `FOO: ${FOO:-}` 在宿主机没配时会把空字符串打进容器。
 * `Number("") === 0`，对 `EVENTS_LLM_TOP_EVENTS` / `EVENTS_LLM_COOLDOWN_MINUTES`
 * 来说 0 的语义是「不限 / 不冷却」——等于把省钱闸门整组关掉。
 */
function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw);
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

/**
 * 可信反向代理，交给 Fastify 的 `trustProxy`（内部走 proxy-addr）。
 * 它决定 `X-Forwarded-For` 里哪几跳可信，也就决定了 `request.ip` 是什么。
 *
 * 取值三选一，**优先用前两种**：
 * - CIDR / IP 列表，逗号分隔（`10.0.0.0/8,192.168.1.5`）
 * - proxy-addr 预置名：`loopback` / `linklocal` / `uniquelocal`
 * - 纯数字 = 信任最靠近本进程的 N 跳
 *
 * 跳数模式只数跳数、**不校验对端是谁**：只要有人能绕过反代直连本进程，
 * 他自带的 XFF 就会被采信（实测 `trustProxy: 1` + 伪造 XFF 即可改写 client IP）。
 * 只有在应用绝对不可直连时才用它，否则一律写网段。
 *
 * **生产必须显式配置。** 这里曾经是写死的 `trustProxy: true`，即无条件采信 XFF
 * 最左值。那等于把 client IP 的决定权交给客户端自己：加一行请求头就能绕过按 IP
 * 的封禁与限流，还能填别人的 IP 去触发自动封禁（拿封禁系统当放大器打无辜用户）。
 * 审计日志 `ip_address` 的可信度也一并没了。
 *
 * dev 默认 `loopback`（vite 代理与直连都来自回环）。注意它同时意味着「从本机发起的
 * 请求可以自报 IP」——本地开发无所谓，拿来手工验证 IP 规则还方便，但别带到任何
 * 可被外部访问的环境。生产 compose 默认 `uniquelocal`（容器网桥是私网），
 * 见 docker-compose.prod.yml；外层若是公网出口的云 LB，必须改成该 LB 的实际网段。
 */
function resolveTrustedProxies(): string | number {
  const raw = optionalStrEnv("TRUSTED_PROXIES");
  // 站点挂在 Cloudflare 橙云后面时，socket 对端恒为 CF 边缘节点。不声明这些段，
  // XFF 会停在那一跳，所有访客坍缩成几百个边缘 IP——按 IP 的封禁与限流随之失真。
  // CF 自己会把访客 IP 追加进 XFF，所以只要信任这些段，标准的 XFF 解析就是对的，
  // 不需要额外去读 CF-Connecting-IP（少一个可伪造的头）。
  const cloudflare = boolEnv("CLOUDFLARE_PROXY", false)
    ? CLOUDFLARE_PROXY_RANGES
    : [];

  if (raw === undefined) {
    if (isProduction) {
      throw new Error(
        "生产环境必须设置 TRUSTED_PROXIES（可信代理 CIDR 列表 / loopback / linklocal / uniquelocal / 跳数）",
      );
    }
    return ["loopback", ...cloudflare].join(",");
  }
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const hops = Number(trimmed);
    if (hops < 1) {
      throw new Error("TRUSTED_PROXIES 作为跳数时必须 >= 1");
    }
    if (cloudflare.length > 0) {
      // 跳数与网段是两种互斥的表达；混用会让人以为 CF 段被信任了，其实没有
      throw new Error(
        "CLOUDFLARE_PROXY=true 时 TRUSTED_PROXIES 必须是网段列表，不能是跳数",
      );
    }
    return hops;
  }
  if (trimmed.toLowerCase() === "true" || trimmed === "*") {
    // 显式写 true 也不放行：这正是本函数要消灭的配置。
    throw new Error(
      'TRUSTED_PROXIES 不接受 "true" / "*"（无条件信任 XFF 等于允许伪造 client IP）',
    );
  }
  return [trimmed, ...cloudflare].join(",");
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
    trustedProxies: resolveTrustedProxies(),
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

/**
 * IP 访问控制（module-ip-access）。
 *
 * `alwaysAllow` 是**永远压过一切封禁规则**的豁免名单，给的是那些「被误封就没人能
 * 修」的地址：监控探针、健康检查、CDN 回源段、支付回调源、自己的办公出口。
 * 没有它，一条过宽的规则就能把你自己锁在后台外面——而那时你已经改不了规则了。
 */
function buildIpAccessConfig() {
  return {
    enabled: boolEnv("IP_ACCESS_ENABLED", true),
    /** 名单快照刷新间隔；跨实例的 Redis 失效广播是它的快路径，这里是兜底 */
    refreshIntervalMs: clampIntEnv(
      "IP_ACCESS_REFRESH_INTERVAL_MS",
      15_000,
      1_000,
      300_000,
    ),
    /** CIDR 列表，逗号分隔。语法非法的条目在启动日志里报警并跳过 */
    alwaysAllow: csvEnv("IP_ACCESS_ALWAYS_ALLOW", ""),
    /** 自动封禁默认 TTL（分钟）；0 不允许——自动规则必须会过期 */
    autoBanMinutes: clampIntEnv("IP_ACCESS_AUTO_BAN_MINUTES", 60, 1, 43_200),
    /** 登录失败多少次触发自动封禁 */
    loginFailureThreshold: clampIntEnv(
      "IP_ACCESS_LOGIN_FAILURE_THRESHOLD",
      10,
      3,
      1_000,
    ),
    /** 登录失败计数窗口（分钟） */
    loginFailureWindowMinutes: clampIntEnv(
      "IP_ACCESS_LOGIN_FAILURE_WINDOW_MINUTES",
      15,
      1,
      1_440,
    ),
    /** nginx geo 片段导出路径；空则不导出 */
    nginxExportPath: strEnv("IP_ACCESS_NGINX_EXPORT_PATH", ""),
    /**
     * 已知代理 / CDN 出口段，**在内置的 Cloudflare 段之外**再补充。
     * 落在这些段里的地址永远不会被自动封禁：那不是访客，是基础设施。
     */
    extraProxyRanges: csvEnv("IP_ACCESS_PROXY_RANGES", ""),
    /**
     * 访问来源统计（「谁在打我」观测面）。
     *
     * 数据在 Redis 里滚动，进程重启即归零——它的用途是「此刻发生了什么」，
     * 不是审计。长期留存看 nginx access log。
     */
    trafficStats: boolEnv("IP_ACCESS_TRAFFIC_STATS", true),
    /** 每个统计桶的时长 */
    trafficBucketSeconds: clampIntEnv(
      "IP_ACCESS_TRAFFIC_BUCKET_SECONDS",
      300,
      60,
      3_600,
    ),
    /** 观察窗口 = bucketSeconds × buckets（默认 12 × 5min = 1 小时） */
    trafficBuckets: clampIntEnv("IP_ACCESS_TRAFFIC_BUCKETS", 12, 1, 288),
    /**
     * 每桶最多跟踪多少个来源。
     *
     * 一次 /16 范围的扫描能塞进上万个只出现过一次的 IP；不设上限，
     * Redis 内存会被观测数据吃掉——那比不做观测更糟。
     */
    trafficMaxTracked: clampIntEnv(
      "IP_ACCESS_TRAFFIC_MAX_TRACKED",
      2_000,
      100,
      50_000,
    ),

    /**
     * 按 IP 限流。封禁只对少数固定 IP 有效，限流才是对付「很多 IP 各来一点」
     * 的工具——它不关心对方是谁，只关心要得太多了。
     */
    rateLimitEnabled: boolEnv("IP_ACCESS_RATE_LIMIT_ENABLED", true),
    /**
     * `log_only`（默认）只记录不拒绝。
     *
     * 阈值定错的代价是把真实用户挡在门外，比它要防的滥用严重得多。
     * 先看几天日志里谁会被挡，再切 `enforce`。
     */
    rateLimitMode: strEnv("IP_ACCESS_RATE_LIMIT_MODE", "log_only"),
    /** 登录 / 注册 / 改密：爆破的目标，最严。0 = 该档不限 */
    rateLimitAuthPerMinute: clampIntEnv(
      "IP_ACCESS_RATE_LIMIT_AUTH_PER_MINUTE",
      20,
      0,
      100_000,
    ),
    /** 匿名可写的公开接口（留言、订阅、表单）：垃圾内容的入口 */
    rateLimitPublicPerMinute: clampIntEnv(
      "IP_ACCESS_RATE_LIMIT_PUBLIC_PER_MINUTE",
      30,
      0,
      100_000,
    ),
    /**
     * 其余请求。刻意定得宽——一个共享出口（公司 NAT、咖啡馆）后面可能有几十个
     * 真实用户，定严了先挡住的是他们。这一档只用来挡明显异常。
     */
    rateLimitDefaultPerMinute: clampIntEnv(
      "IP_ACCESS_RATE_LIMIT_DEFAULT_PER_MINUTE",
      600,
      0,
      100_000,
    ),
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
     * 每站点每轮最多把几条**还没归属事件的信号**送去聚类。
     *
     * 聚类的待办队列在库里（`event_id IS NULL`）而不是进程内，所以一轮抛异常
     * 丢掉的信号下一轮会被重新捡起来。限额是为了让积压摊平：窗口外的孤儿会
     * 各自立一个事件，一次放两千多条进来等于一轮往库里灌两千多个补记事件，
     * 每个还要跑一次刷新与分析。积压清完后这个数恒大于单轮新增量。
     */
    pendingClusterLimit: clampIntEnv(
      "EVENTS_PENDING_CLUSTER_LIMIT",
      500,
      1,
      100_000,
    ),
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
    llmCooldownMinutes: clampIntEnv(
      "EVENTS_LLM_COOLDOWN_MINUTES",
      30,
      0,
      24 * 60,
    ),
    /**
     * 每个站点每轮最多做几次**窄分类调用**（只出 kind + entities）。
     *
     * 它服务的是被上面三道闸门拦下的那批单信号事件——闸门的理由
     *（「单信号时 LLM 退化成给一篇文章换个说法」）对摘要成立，对分类不成立：
     * 版本号 / 金额 / 当事方埋在正文里，拎出来是单信号事件唯一可能的增量。
     * 每个事件终生只跑一次（`NewsEvent.classified_at`），所以这个数只决定
     * 存量语料多久补完，不是持续成本。
     *
     * **0 = 关掉**——与 `llmTopEvents` / `llmCooldownMinutes` 的 0 语义相反
     *（那两个 0 是「不限 / 不冷却」）。刻意的：compose 里 `${VAR:-}` 打进来的
     * 空串按 `Number("") === 0` 会**关掉分类**，而在这个键上
     * 「不小心不花钱」远好过「不小心花钱」。
     */
    llmClassifyPerRound: clampIntEnv(
      "EVENTS_LLM_CLASSIFY_PER_ROUND",
      40,
      0,
      1000,
    ),
    /**
     * 语料保留期（天）。信号无上限增长是这个模块最早会撞上的墙——
     * 采集每 15 分钟按站点追加，从来没有回收路径。
     */
    signalRetentionDays: clampIntEnv(
      "EVENTS_SIGNAL_RETENTION_DAYS",
      90,
      7,
      3650,
    ),
    eventRetentionDays: clampIntEnv(
      "EVENTS_EVENT_RETENTION_DAYS",
      180,
      7,
      3650,
    ),
  };
}

function resolveEventsAnalyzer(): "auto" | "heuristic" | "llm" {
  const value = (optionalStrEnv("EVENTS_ANALYZER") ?? "auto").toLowerCase();
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

/**
 * 平台级发信通道 —— 租户没有自己配时的回落。
 *
 * **没有「免费兜底」这一档**：所谓免费额度（Resend / Brevo）仍然要平台管理员去注册、
 * 拿凭据、验域名，那就是这里的平台默认，不是什么零配置。三档都没有时发信能力
 * 就是不可用，`MailProvider.isConfigured()` 返回 false，调用方把入口收起来。
 *
 * `log` driver 是开发环境的零配置默认：邮件全文进日志，不出网、不烧送达率。
 * 生产禁用——真在生产用它，等于所有确认信、退订信静默消失。
 */
function buildMailConfig() {
  const driver = strEnv("MAIL_DRIVER", isProduction ? "" : "log").toLowerCase();
  if (driver && driver !== "smtp" && driver !== "resend" && driver !== "log") {
    throw new Error(
      `MAIL_DRIVER 取值非法：${driver}（可选 smtp / resend / log）`,
    );
  }
  if (driver === "log" && isProduction) {
    throw new Error(
      "MAIL_DRIVER=log 只能用于开发环境：生产用它会让所有邮件静默消失",
    );
  }
  return {
    driver: driver as "" | "smtp" | "resend" | "log",
    /*
     * 投递回调的验签密钥（Svix `whsec_…`）。回调地址是**全站一个**、没有租户上下文，
     * 所以只能放平台级——按租户存的话，一条回调进来我们不知道该拿谁的密钥去验。
     * 空 = 不接回调：验签一律失败，退信与投诉就收不到（不是静默通过）。
     */
    webhookSecret: strEnv("MAIL_WEBHOOK_SECRET", ""),
    /** resend 的平台默认 API key；租户可在设置页覆盖（与 SMTP 密码共用 secret 列）。 */
    resendApiKey: strEnv("MAIL_RESEND_API_KEY", ""),
    /** 信封发件人；留空则发信能力视为未配置（收件方一律拒收无 From 的信）。 */
    from: strEnv("MAIL_FROM", ""),
    smtp: {
      host: strEnv("MAIL_SMTP_HOST", ""),
      port: clampIntEnv("MAIL_SMTP_PORT", 587, 1, 65535),
      /** 465 走隐式 TLS；587 走 STARTTLS，此处应为 false。 */
      secure: boolEnv("MAIL_SMTP_SECURE", false),
      user: strEnv("MAIL_SMTP_USER", ""),
      password: strEnv("MAIL_SMTP_PASSWORD", ""),
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
  ipAccess: buildIpAccessConfig(),
  infra: buildInfraConfig(),
  openai: buildOpenAiConfig(),
  embeddings: buildEmbeddingsConfig(),
  events: buildEventsConfig(),
  billing: buildBillingConfig(),
  shop: buildShopConfig(),
  mail: buildMailConfig(),
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
     * 宿主机 ACME helper。空则平台「签发证书」不可用。
     * 生产 compose 默认 `http://host.docker.internal:9370`（helper 听 0.0.0.0 + iptables 限私网）。
     */
    acmeHelperUrl: strEnv("ACME_HELPER_URL", ""),
    acmeHelperToken: strEnv("ACME_HELPER_TOKEN", ""),
  },
};

export type Config = typeof config;
