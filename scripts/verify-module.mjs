#!/usr/bin/env node
/**
 * 模块契约校验（create-module skill 「交付前自检」的机器化版本）
 *
 * skill 里的 checklist 靠人/agent 自觉逐条比对，漏一条不会有任何反馈——
 * 这个脚本把其中**可静态判定**的部分翻成断言，让「生成出来的模块是否合规」
 * 变成一个能进 CI 的布尔值。
 *
 *   node scripts/verify-module.mjs            # 检查全部模块
 *   node scripts/verify-module.mjs notes      # 只查某个模块
 *   node scripts/verify-module.mjs --json     # 机器可读输出
 *
 * 退出码：0 = 无 error（warn 不阻断）；1 = 存在 error。
 *
 * 口径：纯文本/正则静态检查，不做类型解析——宁可漏报也别误报，
 * 误报会让人学会忽略这个脚本，那比没有它更糟。
 */
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULES_DIR = path.join(ROOT, "packages", "modules");
const EXTERNAL_MODULES_DIR = path.join(ROOT, "packages", "external-modules");
const SERVER_REGISTRY = path.join(
  ROOT,
  "apps",
  "server",
  "src",
  "enabled-modules.ts",
);
const CLIENT_REGISTRY = path.join(
  ROOT,
  "apps",
  "client",
  "src",
  "enabled-modules.ts",
);
const SERVER_EXTERNAL_REGISTRY = path.join(
  ROOT,
  "apps",
  "server",
  "src",
  "external-modules.ts",
);
const CLIENT_EXTERNAL_REGISTRY = path.join(
  ROOT,
  "apps",
  "client",
  "src",
  "external-modules.ts",
);
const TENANT_MODELS = path.join(ROOT, "eslint-rules", "tenant-models.json");
const STATIC_MANIFEST = path.join(
  ROOT,
  "apps",
  "server",
  "scripts",
  "lib",
  "module-manifest.ts",
);
const TENANT_GUARD = path.join(
  ROOT,
  "packages",
  "server-kernel",
  "src",
  "lib",
  "tenant-guard.ts",
);
const PRISMA_MODELS_DIR = path.join(ROOT, "apps", "server", "prisma", "models");

const args = process.argv.slice(2);
const AS_JSON = args.includes("--json");
const ONLY = args.filter((a) => !a.startsWith("--"));

/** 租户侧挂载点：这些挂载点下的页面必须套 PageLayout */
const TENANT_MOUNTS = [
  "renderRoutes",
  "renderTenantRoutes",
  "renderSuperUserRoutes",
];

// ---------------------------------------------------------------- 基础工具

const read = (p) => readFileSync(p, "utf8");

function walk(dir, exts) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

const all = (re, text, group = 1) =>
  [...text.matchAll(re)].map((m) => m[group]);

/**
 * 取出 `key: [ … ]` / `key = [ … ]` 的数组字面量文本（按括号配对，容忍嵌套对象）。
 * 找不到返回 null——调用方据此区分「没声明」与「声明为空」。
 */
function arrayBlock(text, key) {
  const start =
    new RegExp(`\\b${key}\\s*[:=]\\s*\\[`, "u").exec(text)?.index ?? -1;
  if (start === -1) return null;
  let depth = 0;
  for (let i = text.indexOf("[", start); i < text.length; i += 1) {
    if (text[i] === "[") depth += 1;
    else if (text[i] === "]") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

// ---------------------------------------------------------------- 模块上下文

function loadModule(id, baseDir = MODULES_DIR, isExternal = false) {
  const dir = path.join(baseDir, id);
  const serverManifest = path.join(dir, "server", "module.ts");
  const clientManifest = path.join(dir, "client", "module.tsx");
  // 外部模块的 schema 可能在 prisma/schema.prisma（由 beWater.prismaSchema 指定）
  const schemaCandidates = isExternal
    ? [
        path.join(dir, "schema.prisma"),
        path.join(dir, "prisma", "schema.prisma"),
      ]
    : [path.join(dir, "schema.prisma")];
  const schema = schemaCandidates.find((p) => existsSync(p)) ?? null;
  return {
    id,
    dir,
    isExternal,
    serverManifestText: existsSync(serverManifest)
      ? read(serverManifest)
      : null,
    clientManifestText: existsSync(clientManifest)
      ? read(clientManifest)
      : null,
    serverFiles: walk(path.join(dir, "server"), [".ts"]).filter(
      (f) => !f.endsWith(".test.ts"),
    ),
    clientFiles: walk(path.join(dir, "client"), [".ts", ".tsx"]).filter(
      (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
    ),
    schema,
  };
}

/** manifest 中 `shared.permissions[].key` */
function declaredPermissions(mod) {
  if (!mod.serverManifestText) return [];
  const block = arrayBlock(mod.serverManifestText, "permissions");
  return block ? all(/key:\s*"([^"]+)"/gu, block) : [];
}

/** manifest 中 `shared.auditActions[].action` */
function declaredAuditActions(mod) {
  if (!mod.serverManifestText) return [];
  const block = arrayBlock(mod.serverManifestText, "auditActions");
  return block ? all(/action:\s*"?([A-Z0-9_]+)"?/gu, block) : [];
}

// ---------------------------------------------------------------- 各项检查

/**
 * 1. server / client 注册表
 *
 * 光看 import 路径不够——import 留着、数组里漏一行同样等于没启用，
 * 所以要顺着 import 的局部名去 ENABLED_* 数组里找。
 *
 * 外部模块的注册表是 generated `external-modules.ts`（由 gen:external-modules 生成），
 * import 路径是包名（`<pkgName>/server/index.js`）而非 `@be-water/modules/<id>/...`。
 */
function checkRegistry(mod, add) {
  const isRegistered = (registryPath, modulePath, arrayName) => {
    const text = read(registryPath);
    const imported = new RegExp(
      `import\\s*\\{\\s*(\\w+)[^}]*\\}\\s*from\\s*"[^"]*${modulePath}"`,
      "u",
    ).exec(text);
    if (!imported) return false;
    const block = arrayBlock(text, arrayName);
    return (
      block !== null && new RegExp(`\\b${imported[1]}\\b`, "u").test(block)
    );
  };

  if (mod.isExternal) {
    // 外部模块：检查 generated external-modules.ts
    const pkgName = JSON.parse(read(path.join(mod.dir, "package.json"))).name;
    if (
      mod.serverManifestText &&
      !isRegistered(
        SERVER_EXTERNAL_REGISTRY,
        `${pkgName}/server/index.js`,
        "EXTERNAL_SERVER_MODULES",
      )
    ) {
      add(
        "error",
        "registry",
        `未在 apps/server/src/external-modules.ts 的 EXTERNAL_SERVER_MODULES 中找到——请运行 \`pnpm gen:external-modules\``,
      );
    }
    if (
      mod.clientManifestText &&
      !isRegistered(
        CLIENT_EXTERNAL_REGISTRY,
        `${pkgName}/client/module.js`,
        "EXTERNAL_CLIENT_MODULES",
      )
    ) {
      add(
        "error",
        "registry",
        `未在 apps/client/src/external-modules.ts 的 EXTERNAL_CLIENT_MODULES 中找到——请运行 \`pnpm gen:external-modules\``,
      );
    }
  } else {
    // 内部模块：检查 enabled-modules.ts
    if (
      mod.serverManifestText &&
      !isRegistered(
        SERVER_REGISTRY,
        `/modules/${mod.id}/server/index.js`,
        "ENABLED_SERVER_MODULES",
      )
    ) {
      add(
        "error",
        "registry",
        `未加入 apps/server/src/enabled-modules.ts 的 ENABLED_SERVER_MODULES`,
      );
    }
    if (
      mod.clientManifestText &&
      !isRegistered(
        CLIENT_REGISTRY,
        `/modules/${mod.id}/client/module.js`,
        "ENABLED_CLIENT_MODULES",
      )
    ) {
      add(
        "error",
        "registry",
        `未加入 apps/client/src/enabled-modules.ts 的 ENABLED_CLIENT_MODULES`,
      );
    }
  }

  // CI 脚本用的静态清单（内外模块统一检查）
  if (mod.serverManifestText && existsSync(STATIC_MANIFEST)) {
    if (!read(STATIC_MANIFEST).includes(`id: "${mod.id}"`)) {
      add(
        "error",
        "registry",
        `未加入 apps/server/scripts/lib/module-manifest.ts 的 SERVER_MODULE_MANIFEST${mod.isExternal ? "——请运行 `pnpm gen:external-modules`" : ""}`,
      );
    }
  }
}

/** 2. Prisma：租户字段 + tenant-models.json + 汇入 apps/server 的符号链接 */
function checkPrisma(mod, add) {
  if (!mod.schema) return;
  const text = read(mod.schema);
  const tenantModels = JSON.parse(read(TENANT_MODELS));

  const guardText = existsSync(TENANT_GUARD) ? read(TENANT_GUARD) : "";

  for (const m of text.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gmu)) {
    const [, name, body] = m;

    // tenant-guard 覆盖所有模型（含全局模型），未登记会让 Prisma client 启动即失败
    if (guardText && !new RegExp(`^  ${name}:`, "mu").test(guardText)) {
      add(
        "error",
        "prisma",
        `模型 ${name} 未在 tenant-guard 的 MODEL_POLICIES 登记——Prisma client 会启动即失败`,
      );
    }

    const column = /^\s*tenant_id\s+/mu.test(body)
      ? "tenant_id"
      : /^\s*tenant_slug\s+/mu.test(body)
        ? "tenant_slug"
        : null;
    if (!column) continue; // 全局模型（如 BackgroundJob）不强制租户列
    const key = name[0].toLowerCase() + name.slice(1);
    if (!(key in tenantModels)) {
      add(
        "error",
        "prisma",
        `模型 ${name} 含 ${column}，但未登记到 eslint-rules/tenant-models.json（key: "${key}"）`,
      );
    } else if (tenantModels[key] !== column) {
      add(
        "error",
        "prisma",
        `模型 ${name} 的租户列是 ${column}，tenant-models.json 里写的是 ${tenantModels[key]}`,
      );
    }
  }

  const link = path.join(PRISMA_MODELS_DIR, `${mod.id}.prisma`);
  if (!existsSync(link)) {
    add(
      "error",
      "prisma",
      `缺少符号链接 apps/server/prisma/models/${mod.id}.prisma → packages/modules/${mod.id}/schema.prisma`,
    );
  } else if (!lstatSync(link).isSymbolicLink()) {
    add(
      "error",
      "prisma",
      `apps/server/prisma/models/${mod.id}.prisma 应为符号链接而非副本`,
    );
  }
}

/** 3. 租户开关：registerTenantGatedRoutes 的 key 必须有 entitlement 声明 */
function checkEntitlements(mod, add) {
  const gated = new Set();
  for (const file of mod.serverFiles) {
    for (const key of all(
      /registerTenantGatedRoutes\(\s*\w+\s*,\s*"([^"]+)"/gu,
      read(file),
    )) {
      gated.add(key);
    }
  }
  if (gated.size === 0) return;

  const sharedText = walk(path.join(mod.dir, "shared"), [".ts"])
    .map((f) => read(f))
    .join("\n");
  for (const key of gated) {
    if (!new RegExp(`key:\\s*"${key}"`, "u").test(sharedText)) {
      add(
        "error",
        "entitlement",
        `registerTenantGatedRoutes("${key}") 没有对应的 TenantModuleEntitlement 声明（shared/**/entitlements.ts）`,
      );
    }
  }
  if (
    mod.serverManifestText &&
    !mod.serverManifestText.includes("tenantEntitlements")
  ) {
    add(
      "error",
      "entitlement",
      `server manifest 缺少 tenantEntitlements——平台控制台看不到这个开关`,
    );
  }
  if (
    mod.clientManifestText &&
    !mod.clientManifestText.includes("tenantEntitlements")
  ) {
    add(
      "error",
      "entitlement",
      `client manifest 缺少 tenantEntitlements——前端 nav/路由不会随开关隐藏`,
    );
  }
}

/** 4. 权限 key：使用处必须在某个 manifest 里声明过 */
function checkPermissions(mod, add, declaredEverywhere) {
  const used = new Map(); // key -> 出处
  const record = (key, file) => {
    if (!used.has(key)) used.set(key, path.relative(ROOT, file));
  };
  for (const file of [...mod.serverFiles, ...mod.clientFiles]) {
    const text = read(file);
    for (const key of all(
      /(?:requirePermission|hasPermission)\(\s*"([^"]+)"/gu,
      text,
    ))
      record(key, file);
    for (const key of all(/\bpermission=\{?"([^"]+)"/gu, text))
      record(key, file);
    for (const block of all(/anyPermission:\s*(\[[^\]]*\])/gu, text)) {
      for (const key of all(/"([^"]+)"/gu, block)) record(key, file);
    }
  }
  for (const [key, where] of used) {
    if (!declaredEverywhere.has(key)) {
      add(
        "error",
        "permission",
        `使用了未声明的权限 key "${key}"（${where}）——请加入某个模块 manifest 的 shared.permissions`,
      );
    }
  }
}

/** 5. 排序白名单：前端可排序列 ⊆ 服务端白名单 */
function checkSort(mod, add) {
  const serverFields = new Set();
  for (const file of mod.serverFiles) {
    const text = read(file);
    for (const block of all(
      /SORTABLE_FIELDS\s*=\s*new Set\(\s*(\[[^\]]*\])/gu,
      text,
    )) {
      for (const f of all(/"([^"]+)"/gu, block)) serverFields.add(f);
    }
  }
  if (serverFields.size === 0) return; // 没有服务端排序，跳过

  for (const file of mod.clientFiles) {
    const text = read(file);
    if (!text.includes("enableSorting: true")) continue;
    // 列定义形如 { accessorKey: "x", …, enableSorting: true }
    for (const col of text.matchAll(
      /accessorKey:\s*"([^"]+)"([\s\S]{0,400}?)(?=accessorKey:|$)/gu,
    )) {
      const [, field, rest] = col;
      if (rest.includes("enableSorting: true") && !serverFields.has(field)) {
        add(
          "error",
          "sort",
          `列 "${field}" 开了 enableSorting，但不在服务端排序白名单 {${[...serverFields].join(", ")}}（${path.relative(ROOT, file)}）`,
        );
      }
    }
  }
}

/** 6. 写路由必须记审计；用到的 AuditAction 必须在 manifest 声明 */
function checkAudit(mod, add) {
  const declared = new Set(declaredAuditActions(mod));

  for (const file of mod.serverFiles) {
    if (!file.endsWith(".routes.ts")) continue;
    const text = read(file);
    const chunks = text
      .split(/defineRoute\(|app\.(?:post|patch|put|delete)\(/u)
      .slice(1);
    for (const chunk of chunks) {
      const method = /method:\s*"(POST|PATCH|PUT|DELETE)"/u.exec(chunk)?.[1];
      if (!method) continue;
      if (!/emitAuditLogFromRequestSafe|events\.emit\(/u.test(chunk)) {
        const url = /url:\s*"([^"]*)"/u.exec(chunk)?.[1] ?? "?";
        add(
          "warn",
          "audit",
          `写路由 ${method} ${url} 没有审计事件（${path.relative(ROOT, file)}）`,
        );
      }
    }
    if (declared.size === 0) continue;
    for (const action of all(/AuditAction\.([A-Z0-9_]+)/gu, text)) {
      if (!declared.has(action)) {
        add(
          "warn",
          "audit",
          `AuditAction.${action} 未在 manifest 的 shared.auditActions 中声明`,
        );
      }
    }
  }
}

/** 7+8. 页面外壳与 nav title */
function checkClientShell(mod, add) {
  if (!mod.clientManifestText) return;

  // module.tsx: renderXxx: fnName → 找到导出该函数的文件 → 找它 lazy import 的页面
  const mounts = [...mod.clientManifestText.matchAll(/(render\w+):\s*(\w+)/gu)];
  for (const [, mount, fn] of mounts) {
    const routeFile = mod.clientFiles.find((f) =>
      new RegExp(`export function ${fn}\\b`, "u").test(read(f)),
    );
    if (!routeFile) continue;
    const routeText = read(routeFile);
    for (const spec of all(/import\(\s*"([^"]+)"\s*\)/gu, routeText)) {
      const resolved = resolvePageFile(routeFile, spec);
      if (!resolved) continue;
      const pageText = read(resolved);
      const rel = path.relative(ROOT, resolved);
      const hasPageLayout = /<PageLayout\b/u.test(pageText);
      if (TENANT_MOUNTS.includes(mount) && !hasPageLayout) {
        add("error", "shell", `${mount} 下的页面必须套 PageLayout（${rel}）`);
      }
      if (mount === "renderPlatformRoutes" && hasPageLayout) {
        add(
          "error",
          "shell",
          `renderPlatformRoutes 下的页面不要套 PageLayout，PlatformLayout 已自带标题（${rel}）`,
        );
      }
      if (
        mount === "renderGuestRoutes" &&
        !/<AuthPageShell\b/u.test(pageText)
      ) {
        add(
          "warn",
          "shell",
          `renderGuestRoutes 下的页面通常应使用 AuthPageShell（${rel}）`,
        );
      }
    }
  }

  // 租户侧 nav（AppNavSection）每个 item 必须有 title——移动端标题由它解析
  for (const file of mod.clientFiles) {
    const text = read(file);
    if (!text.includes("AppNavSection")) continue;
    for (const item of text.matchAll(/\{([^{}]*\bpath:\s*"[^"]+"[^{}]*)\}/gu)) {
      const body = item[1];
      const p = /path:\s*"([^"]+)"/u.exec(body)?.[1];
      if (!/\btitle:/u.test(body)) {
        add(
          "error",
          "nav",
          `导航项 ${p} 缺少 title——移动端页头会取不到标题（${path.relative(ROOT, file)}）`,
        );
      }
    }
  }
}

function resolvePageFile(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec).replace(/\.js$/u, "");
  for (const ext of [".tsx", ".ts"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

/** 9. MODULE.md */
function checkDocs(mod, add) {
  if (!existsSync(path.join(mod.dir, "MODULE.md"))) {
    add("warn", "docs", `缺少 MODULE.md`);
  }
}

/**
 * 10. 外部模块边界校验
 *
 * 外部模块只许 import 自 `@be-water/module-sdk`（门面包）和 `@be-water/ui`（原语），
 * 不许直接 import 内核包（server-kernel / client-kit / shared）或内部模块包
 * （@be-water/modules/*）——否则外部模块与内核实现细节耦合，无法独立发布。
 */
const FORBIDDEN_EXTERNAL_PREFIXES = [
  "@be-water/server-kernel",
  "@be-water/client-kit",
  "@be-water/shared",
  "@be-water/modules/",
  "@be-water/server-test",
  "@be-water/client-test",
];

function checkBoundary(mod, add) {
  if (!mod.isExternal) return;

  for (const file of [...mod.serverFiles, ...mod.clientFiles]) {
    const text = read(file);
    for (const match of text.matchAll(/from\s+["']([^"']+)["']/gu)) {
      const specifier = match[1];
      if (specifier.startsWith(".")) continue; // 相对导入
      if (FORBIDDEN_EXTERNAL_PREFIXES.some((p) => specifier.startsWith(p))) {
        add(
          "error",
          "boundary",
          `外部模块禁止直接 import "${specifier}"——只许 import @be-water/module-sdk / @be-water/ui（${path.relative(ROOT, file)}）`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------- 主流程

// 内部模块：@be-water/modules 单包内的目录，靠 manifest 文件识别
const internalIds = readdirSync(MODULES_DIR).filter((id) => {
  const dir = path.join(MODULES_DIR, id);
  if (id === "node_modules" || !statSync(dir).isDirectory()) return false;
  return (
    existsSync(path.join(dir, "server", "module.ts")) ||
    existsSync(path.join(dir, "client", "module.tsx"))
  );
});

// 外部模块：packages/external-modules/* 各自独立成包，靠 package.json 的 beWater.moduleId 识别
const externalIds = existsSync(EXTERNAL_MODULES_DIR)
  ? readdirSync(EXTERNAL_MODULES_DIR).filter((id) => {
      const dir = path.join(EXTERNAL_MODULES_DIR, id);
      if (!statSync(dir).isDirectory()) return false;
      const pkgPath = path.join(dir, "package.json");
      if (!existsSync(pkgPath)) return false;
      const pkg = JSON.parse(read(pkgPath));
      return pkg.beWater?.moduleId;
    })
  : [];

const allIds = [...internalIds, ...externalIds];
const targets = ONLY.length > 0 ? ONLY : allIds;

for (const id of ONLY) {
  if (!allIds.includes(id)) {
    console.error(`✗ 未找到模块 ${id}（可选：${allIds.join(", ")}）`);
    process.exit(1);
  }
}

const modules = [
  ...internalIds.map((id) => loadModule(id)),
  ...externalIds.map((id) => loadModule(id, EXTERNAL_MODULES_DIR, true)),
];
const declaredEverywhere = new Set(modules.flatMap(declaredPermissions));

const findings = [];
for (const mod of modules) {
  if (!targets.includes(mod.id)) continue;
  const add = (level, rule, message) =>
    findings.push({ module: mod.id, level, rule, message });
  checkRegistry(mod, add);
  checkPrisma(mod, add);
  checkEntitlements(mod, add);
  checkPermissions(mod, add, declaredEverywhere);
  checkSort(mod, add);
  checkAudit(mod, add);
  checkClientShell(mod, add);
  checkDocs(mod, add);
  checkBoundary(mod, add);
}

const errors = findings.filter((f) => f.level === "error");

if (AS_JSON) {
  console.log(JSON.stringify({ modules: targets, findings }, null, 2));
} else if (findings.length === 0) {
  console.log(`✅ ${targets.length} 个模块全部通过（${targets.join(", ")}）`);
} else {
  for (const id of targets) {
    const own = findings.filter((f) => f.module === id);
    if (own.length === 0) continue;
    console.log(`\n${id}`);
    for (const f of own) {
      console.log(
        `  ${f.level === "error" ? "✗" : "⚠"} [${f.rule}] ${f.message}`,
      );
    }
  }
  const warns = findings.length - errors.length;
  console.log(
    `\n${errors.length} error / ${warns} warn（共 ${targets.length} 个模块）`,
  );
}

process.exit(errors.length > 0 ? 1 : 0);
