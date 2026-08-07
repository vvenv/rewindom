#!/usr/bin/env node
/**
 * 生产 Docker 应用环境变量门禁。
 *
 * 从 config.ts 收集运行时 env 名，减去「compose 硬编码 / 有安全默认、故意不透传」的 deny-list，
 * 要求剩余键全部出现在 docker-compose.prod.yml → services.app.environment 的透传项
 *（形如 `FOO: ${FOO}` / `FOO: ${FOO:-…}`），并在 scripts/env.production.example 中有文档行。
 *
 *   node scripts/check-prod-app-env.mjs
 *   node scripts/check-prod-app-env.mjs --json
 *
 * 退出码：0 = 通过；1 = 漏同步。
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(
  ROOT,
  "packages/server-kernel/src/lib/config.ts",
);
const COMPOSE_PATH = path.join(ROOT, "docker-compose.prod.yml");
const ENV_EXAMPLE_PATH = path.join(ROOT, "scripts/env.production.example");

const AS_JSON = process.argv.includes("--json");

/**
 * compose 已硬编码、或仅本地/可选调优、默认即可在生产容器运行的键。
 * 新增「运维必须能通过 .env.production 覆盖」的配置时，不要放进本集合。
 */
const COMPOSE_PASSTHROUGH_DENY = new Set([
  "PORT",
  "HOST",
  "DATABASE_URL",
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_DB",
  "EXPORT_BASE_DIR",
  "ATTACHMENT_BASE_DIR",
  "EXPORT_BACKUP_SUBDIR",
  "DATABASE_BACKUP_DIR",
  "ATTACHMENT_STORAGE",
  "WORKERS_ENABLED",
  "ERROR_LOGGING_ENABLED",
  "ERROR_LOG_RETENTION_DAYS",
  "ERROR_LOG_LEVEL",
  "ERROR_LOG_INCLUDE_REQUEST_BODY",
  "ERROR_LOG_INCLUDE_REQUEST_PARAMS",
  "ERROR_LOG_INCLUDE_REQUEST_QUERY",
  "SLOW_QUERY_ENABLED",
  "SLOW_QUERY_THRESHOLD_MS",
  "SLOW_QUERY_BUFFER_SIZE",
  "SLOW_QUERY_FLUSH_INTERVAL_MS",
  "SLOW_QUERY_PARAMS_MAX_LEN",
  "SLOW_QUERY_RETENTION_DAYS",
  "DATABASE_BACKUP_COMPRESS",
  "DATABASE_RESTORE_JOBS",
  "DATABASE_RESTORE_MAX_FILE_BYTES",
  "DATABASE_RESTORE_LOCAL_PATHS",
  "TENANT_GUARD_MODE",
  "PLATFORM_ADMIN_PASSWORD_HASH",
]);

function collectConfigEnvKeys(source) {
  const keys = new Set();
  const helperRe =
    /(?:strEnv|optionalStrEnv|boolEnv|intEnv|clampIntEnv|csvEnv)\(\s*["']([A-Z][A-Z0-9_]*)["']/g;
  for (const match of source.matchAll(helperRe)) {
    keys.add(match[1]);
  }

  // buildOAuthProviderConfig("GITHUB" | "GOOGLE" | "MICROSOFT")
  const oauthRe =
    /buildOAuthProviderConfig\(\s*["'](GITHUB|GOOGLE|MICROSOFT)["']\s*\)/g;
  for (const match of source.matchAll(oauthRe)) {
    const prefix = match[1];
    keys.add(`${prefix}_CLIENT_ID`);
    keys.add(`${prefix}_CLIENT_SECRET`);
    keys.add(`${prefix}_CALLBACK_URL`);
  }

  return keys;
}

function extractAppEnvironmentBlock(composeYaml) {
  const appIdx = composeYaml.search(/^\s*app:\s*$/m);
  if (appIdx < 0) {
    throw new Error("docker-compose.prod.yml: 未找到 services.app");
  }
  const fromApp = composeYaml.slice(appIdx);
  const envIdx = fromApp.search(/^\s*environment:\s*$/m);
  if (envIdx < 0) {
    throw new Error("docker-compose.prod.yml: app 下未找到 environment");
  }
  const fromEnv = fromApp.slice(envIdx);
  const lines = fromEnv.split("\n");
  // environment: 下一层缩进的键值，直到同级或更外层键
  const envLine = lines[0] ?? "";
  const baseIndent = (envLine.match(/^(\s*)/)?.[1] ?? "").length;
  const body = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "" || line.trim().startsWith("#")) {
      continue;
    }
    const indent = (line.match(/^(\s*)/)?.[1] ?? "").length;
    if (indent <= baseIndent) {
      break;
    }
    body.push(line);
  }
  return body.join("\n");
}

/** 透传键：LHS 与 ${LHS} / ${LHS:-…} 同名 */
function collectComposePassthroughKeys(envBlock) {
  const keys = new Set();
  const lineRe = /^\s*([A-Z][A-Z0-9_]*)\s*:\s*(.+)$/gm;
  for (const match of envBlock.matchAll(lineRe)) {
    const key = match[1];
    const value = match[2];
    const passthrough = new RegExp(
      `\\$\\{${key}(?::-[^}]*)?\\}`,
    );
    if (passthrough.test(value)) {
      keys.add(key);
    }
  }
  return keys;
}

function collectEnvExampleKeys(exampleText) {
  const keys = new Set();
  const lineRe = /^\s*#?\s*([A-Z][A-Z0-9_]*)=/gm;
  for (const match of exampleText.matchAll(lineRe)) {
    keys.add(match[1]);
  }
  return keys;
}

function main() {
  const configSource = readFileSync(CONFIG_PATH, "utf8");
  const composeSource = readFileSync(COMPOSE_PATH, "utf8");
  const exampleSource = readFileSync(ENV_EXAMPLE_PATH, "utf8");

  const configKeys = collectConfigEnvKeys(configSource);
  const required = [...configKeys]
    .filter((key) => !COMPOSE_PASSTHROUGH_DENY.has(key))
    .sort();

  const envBlock = extractAppEnvironmentBlock(composeSource);
  const composeKeys = collectComposePassthroughKeys(envBlock);
  const exampleKeys = collectEnvExampleKeys(exampleSource);

  const missingInCompose = required.filter((key) => !composeKeys.has(key));
  const missingInExample = required.filter((key) => !exampleKeys.has(key));
  const extraInCompose = [...composeKeys]
    .filter((key) => !required.includes(key) && !COMPOSE_PASSTHROUGH_DENY.has(key))
    .sort();

  const result = {
    required,
    missingInCompose,
    missingInExample,
    /** compose 有透传但既不在 required 也不在 deny — 多半是忘了进 config 或应加入 deny */
    extraInCompose,
  };

  if (AS_JSON) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `check-prod-app-env: config 要求透传 ${required.length} 个键 → compose app.environment`,
    );
    if (missingInCompose.length === 0 && missingInExample.length === 0) {
      console.log("✓ docker-compose.prod.yml 与 scripts/env.production.example 已覆盖");
    }
    if (missingInCompose.length > 0) {
      console.error("\n✗ 未写入 docker-compose.prod.yml → app.environment：");
      for (const key of missingInCompose) {
        console.error(`  - ${key}: \${${key}:-}`);
      }
      console.error(
        "\n  生产容器只认 compose 白名单；请同步后重跑本检查。",
      );
    }
    if (missingInExample.length > 0) {
      console.error("\n✗ 未写入 scripts/env.production.example：");
      for (const key of missingInExample) {
        console.error(`  - ${key}`);
      }
    }
    if (extraInCompose.length > 0 && !AS_JSON) {
      console.warn(
        "\n⚠ compose 透传了 config 未声明的键（可忽略，或补进 config / deny-list）：",
      );
      for (const key of extraInCompose) {
        console.warn(`  - ${key}`);
      }
    }
  }

  if (missingInCompose.length > 0 || missingInExample.length > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
