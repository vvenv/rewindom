import { readFileSync, readdirSync, readlinkSync, statSync } from "node:fs";
import path from "node:path";

/** Prisma schema 文件全部集中在此目录（相对 apps/server）。 */
const SCHEMA_DIR = "prisma/models";

/**
 * Prisma schema 文件 → 拥有它的包/模块，**从符号链接目标推导**。
 *
 * `prisma/models/*.prisma` 是指向各包内真实 schema 的符号链接：
 *
 *   packages/server-kernel/prisma/<name>.prisma   → 归 kernel
 *   packages/modules/<id>/schema.prisma           → 归该模块
 *   packages/external-modules/<id>/prisma/...     → 归外部模块（id 同目录名）
 *   packages/<product>/prisma/<name>.prisma       → 归下游业务包（模块 id 同包名）
 *
 * Prisma 只认单一 schema 目录（且各文件间本就存在跨文件 `@relation`），
 * 所以必须有这个汇合点；但**所有权仍属各包**——链接目标即归属声明，
 * 无需再手工维护映射表（那张表还曾是与上游 fork 的冲突点）。
 */
function readSchemaOwners(serverRoot: string): Map<string, string> {
  const dir = path.join(serverRoot, SCHEMA_DIR);
  const owners = new Map<string, string>();

  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".prisma")) continue;
    const target = readlinkSync(path.join(dir, entry));
    const parts = target.split(path.sep);
    const pkgIdx = parts.indexOf("packages");
    if (pkgIdx === -1 || !parts[pkgIdx + 1]) {
      throw new Error(
        `无法从链接目标推导归属：${SCHEMA_DIR}/${entry} -> ${target}\n` +
          `期望指向 packages/<pkg>/… 下的 schema 文件。`,
      );
    }
    const pkg = parts[pkgIdx + 1]!;
    owners.set(
      entry,
      pkg === "server-kernel"
        ? "kernel"
        : pkg === "modules" || pkg === "external-modules"
          ? parts[pkgIdx + 2]!
          : pkg,
    );
  }

  return owners;
}

/** Prisma models owned by kernel schema — cross-relations do not imply module requires. */
export const KERNEL_PRISMA_MODELS = new Set([
  "User",
  "Tenant",
  "TenantApiKey",
  "TenantSetting",
  "RefreshToken",
]);

export interface ModuleDependencyViolation {
  moduleId: string;
  missingModuleId: string;
  source: "schema" | "code";
  detail: string;
}

export interface ModuleManifestEntry {
  id: string;
  kind?: "kernel" | "infrastructure" | "business";
  requires?: readonly string[];
}

/** Infra modules may call audit/platform/error-log without declaring requires. */
const CROSS_CUTTING_INFRA = new Set(["audit", "platform", "error-log"]);

/**
 * Allowed code-import edges that would otherwise create a requires cycle.
 * Prefer event bus or provider registry over growing this list.
 * （历史上的 platform/background-job → 业务子域例外已随业务单包收敛消除，勿再回加。）
 */
const CODE_IMPORT_EXCEPTIONS = new Set(["rbac->audit"]);

/**
 * 模块同处一个包（`@be-water/modules`）后，跨模块引用是**包内相对路径**
 * （如 `../platform/server/x.js`），不再是独立包规格。
 * 因此改为解析相对 specifier 的落点，判断是否落在兄弟模块目录下。
 */
const relativeImportPattern = /from\s+["'](\.[^"']*)["']/g;

/** 以包规格引用基础设施模块（业务包 → 基础设施包，或 apps 侧）。 */
const packageModuleImportPattern =
  /from\s+["']@be-water\/modules\/([^/"']+)\//g;

const foreignKeyRelationPattern =
  /^\s+\w+\s+(\w+)(\?)?\s+@relation\(\s*fields:/gm;

function walkTypeScriptFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkTypeScriptFiles(fullPath, files);
    } else if (
      entry.endsWith(".ts") &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".spec.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function readSchemaFile(serverRoot: string, schemaFile: string): string {
  return readFileSync(path.join(serverRoot, SCHEMA_DIR, schemaFile), "utf8");
}

/** 断链会在此抛错——链接即归属声明，无需再单独校验一致性。 */
export function assertSchemaOwnersComplete(serverRoot: string): void {
  readSchemaOwners(serverRoot);
}

export function buildModelToModuleMap(serverRoot: string): Map<string, string> {
  const modelToModule = new Map<string, string>();
  for (const [schemaFile, moduleId] of readSchemaOwners(serverRoot)) {
    const content = readSchemaFile(serverRoot, schemaFile);
    for (const match of content.matchAll(/^model\s+(\w+)\s+\{/gm)) {
      modelToModule.set(match[1]!, moduleId);
    }
  }

  return modelToModule;
}

function schemaFilesForModule(serverRoot: string, moduleId: string): string[] {
  return [...readSchemaOwners(serverRoot)]
    .filter(([, owner]) => owner === moduleId)
    .map(([file]) => file);
}

export function parseSchemaForeignModuleDeps(
  schemaContent: string,
  moduleId: string,
  modelToModule: ReadonlyMap<string, string>,
): string[] {
  const deps = new Set<string>();

  for (const match of schemaContent.matchAll(foreignKeyRelationPattern)) {
    const modelName = match[1]!;
    if (KERNEL_PRISMA_MODELS.has(modelName)) {
      continue;
    }
    const ownerModule = modelToModule.get(modelName);
    if (ownerModule && ownerModule !== "kernel" && ownerModule !== moduleId) {
      deps.add(ownerModule);
    }
  }

  return [...deps];
}

export function getSchemaImpliedModuleDeps(
  serverRoot: string,
  moduleId: string,
  modelToModule: ReadonlyMap<string, string>,
): string[] {
  const schemaFiles = schemaFilesForModule(serverRoot, moduleId);
  if (schemaFiles.length === 0) {
    return [];
  }

  const deps = new Set<string>();
  for (const schemaFile of schemaFiles) {
    const content = readSchemaFile(serverRoot, schemaFile);
    for (const depId of parseSchemaForeignModuleDeps(
      content,
      moduleId,
      modelToModule,
    )) {
      deps.add(depId);
    }
  }

  return [...deps];
}

function directoryExists(dir: string): boolean {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 模块 server 目录的位置。
 *
 * 内部模块在 `packages/modules/<id>/server/`，外部模块在
 * `packages/external-modules/<id>/server/`。优先查内部，不存在再查外部。
 */
function resolveModuleServerDir(
  monorepoRoot: string,
  moduleId: string,
): string {
  const internal = path.join(
    monorepoRoot,
    "packages",
    "modules",
    moduleId,
    "server",
  );
  if (directoryExists(internal)) return internal;
  return path.join(
    monorepoRoot,
    "packages",
    "external-modules",
    moduleId,
    "server",
  );
}

/** 相对 specifier 落在哪个兄弟模块下；不跨模块则返回 null。 */
function resolveSiblingModule(
  modulesRoot: string,
  fromFile: string,
  specifier: string,
): string | null {
  const target = path.resolve(path.dirname(fromFile), specifier);
  const rel = path.relative(modulesRoot, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return null; // 逃出 packages/modules/，不是跨模块引用
  }
  const [owner] = rel.split(path.sep);
  return owner || null;
}

export function getCodeImpliedModuleDeps(
  monorepoRoot: string,
  moduleId: string,
): Map<string, string> {
  const moduleDir = resolveModuleServerDir(monorepoRoot, moduleId);
  const deps = new Map<string, string>();

  if (!directoryExists(moduleDir)) {
    return deps;
  }

  // 外部模块的兄弟根是 packages/external-modules/，内部模块是 packages/modules/
  const isExternal = moduleDir.startsWith(
    path.join(monorepoRoot, "packages", "external-modules"),
  );
  const modulesRoot = path.join(
    monorepoRoot,
    "packages",
    isExternal ? "external-modules" : "modules",
  );

  for (const filePath of walkTypeScriptFiles(moduleDir)) {
    const content = readFileSync(filePath, "utf8");
    const relativePath = path.relative(moduleDir, filePath);

    for (const match of content.matchAll(relativeImportPattern)) {
      const targetModuleId = resolveSiblingModule(
        modulesRoot,
        filePath,
        match[1]!,
      );
      if (!targetModuleId || targetModuleId === moduleId) {
        continue;
      }
      deps.set(
        targetModuleId,
        `${relativePath}: imports ${match[1]!} (${isExternal ? "packages/external-modules" : "packages/modules"}/${targetModuleId}/)`,
      );
    }

    for (const match of content.matchAll(packageModuleImportPattern)) {
      const targetModuleId = match[1]!;
      if (targetModuleId === moduleId) {
        continue;
      }
      deps.set(
        targetModuleId,
        `${relativePath}: imports @be-water/modules/${targetModuleId}`,
      );
    }
  }

  return deps;
}

export function collectModuleDependencyViolations(
  serverRoot: string,
  monorepoRoot: string,
  modules: readonly ModuleManifestEntry[],
): ModuleDependencyViolation[] {
  const violations: ModuleDependencyViolation[] = [];
  const modelToModule = buildModelToModuleMap(serverRoot);

  for (const module of modules) {
    const declared = new Set(module.requires ?? []);

    for (const depId of getSchemaImpliedModuleDeps(
      serverRoot,
      module.id,
      modelToModule,
    )) {
      if (!declared.has(depId)) {
        violations.push({
          moduleId: module.id,
          missingModuleId: depId,
          source: "schema",
          detail: `${SCHEMA_DIR}/{${schemaFilesForModule(serverRoot, module.id).join(",")}} has FK relation to module "${depId}"`,
        });
      }
    }

    for (const [depId, detail] of getCodeImpliedModuleDeps(
      monorepoRoot,
      module.id,
    )) {
      const exceptionKey = `${module.id}->${depId}`;
      if (CODE_IMPORT_EXCEPTIONS.has(exceptionKey)) {
        continue;
      }
      if (module.kind === "infrastructure" && CROSS_CUTTING_INFRA.has(depId)) {
        continue;
      }
      if (!declared.has(depId)) {
        violations.push({
          moduleId: module.id,
          missingModuleId: depId,
          source: "code",
          detail,
        });
      }
    }
  }

  return violations;
}

export function formatModuleDependencyViolations(
  violations: readonly ModuleDependencyViolation[],
): string {
  if (violations.length === 0) {
    return "";
  }

  const lines = violations.map(
    (v) =>
      `- module "${v.moduleId}" missing requires "${v.missingModuleId}" (${v.source}): ${v.detail}`,
  );
  return [
    "Module dependency violations (add missing ids to module.requires):",
    ...lines,
  ].join("\n");
}
