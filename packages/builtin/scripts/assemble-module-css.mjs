/**
 * 从各模块共置的 `.css` 拼出 `<module>/shared/site-css.generated.ts`。
 *
 * marketing 内置段的样式在构建期打进 `MARKETING_SECTION_CSS`；**贡献段**（site-member、
 * site-billing、billing、以及 `modules/` 下的外部模块）进不了那次打包，只能随注册把
 * CSS 字符串交给 marketing。字符串必须是构建期生成物而不是运行时 `fs` 读——生产
 * server 是单文件 esbuild bundle，旁路 `.css` 的相对路径在 bundle 后失效；同一份
 * 常量还要进浏览器 bundle（SPA / 编辑器预览），浏览器里更没有 `fs`。
 *
 * 真源**靠扫目录发现**：模块在 `shared/site-css/` 下放 `<name>.css`，就会生成导出
 * `<NAME>_CSS`（kebab-case → SCREAMING_SNAKE）。`@import "./x.css"` 会被内联，用于
 * 「账户页自带认证卡样式」这类组合。esbuild minify 顺带剥掉设计注释——源文件里可以
 * 放心写长注释，不会发给访客。
 *
 * 禁止手写 `shared/*-css.ts` 模板字符串（那是这条链的断点）。
 *
 *   node packages/builtin/scripts/assemble-module-css.mjs
 *   node packages/builtin/scripts/assemble-module-css.mjs shop
 */

import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const EXTERNAL_MODULES_DIR = path.join(REPO_ROOT, "modules");

/** marketing 有自己的 assemble（site-css/assemble.mjs），不归这里管。 */
const SKIP_DIRS = new Set(["node_modules", "scripts", "marketing"]);

function moduleDirOf(moduleId) {
  const builtin = path.join(PACKAGE_ROOT, moduleId);
  if (existsSync(path.join(builtin, "shared", "site-css"))) return builtin;
  const external = path.join(EXTERNAL_MODULES_DIR, moduleId);
  if (existsSync(path.join(external, "shared", "site-css"))) return external;
  return builtin;
}

function cssDirOf(moduleId) {
  return path.join(moduleDirOf(moduleId), "shared", "site-css");
}

function listCssFiles(moduleId) {
  const dir = cssDirOf(moduleId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".css"))
    .sort();
}

function listDirIds(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !SKIP_DIRS.has(entry.name),
    )
    .map((entry) => entry.name);
}

/** 带 `shared/site-css/*.css` 的模块 id（内置 + `modules/`）。 */
export function listModuleCssIds() {
  const ids = new Set([
    ...listDirIds(PACKAGE_ROOT),
    ...listDirIds(EXTERNAL_MODULES_DIR),
  ]);
  return [...ids].filter((id) => listCssFiles(id).length > 0).sort();
}

/** `member-auth.css` → `MEMBER_AUTH_CSS`。 */
function constNameOf(fileName) {
  return `${path.basename(fileName, ".css").replaceAll("-", "_").toUpperCase()}_CSS`;
}

/** bundle 是为了内联 `@import`；minify 剥注释、压体积。 */
function buildCss(entryPath) {
  const result = esbuild.buildSync({
    entryPoints: [entryPath],
    bundle: true,
    minify: true,
    write: false,
    logLevel: "silent",
  });
  return result.outputFiles[0].text.trim();
}

/** @returns {Record<string, string>} 导出常量名 → 压缩后的 CSS。 */
export function assembleModuleSiteCss(moduleId) {
  const dir = cssDirOf(moduleId);
  const out = {};
  for (const file of listCssFiles(moduleId)) {
    out[constNameOf(file)] = buildCss(path.join(dir, file));
  }
  return out;
}

function escapeForTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

/** @returns {{ outPath: string, exports: string[], bytes: number }} */
export function writeModuleSiteCssGenerated(moduleId) {
  const assembled = assembleModuleSiteCss(moduleId);
  const body = Object.entries(assembled)
    .map(
      ([name, css]) =>
        `export const ${name} = \`${escapeForTemplateLiteral(css)}\`;`,
    )
    .join("\n\n");
  const outPath = path.join(
    moduleDirOf(moduleId),
    "shared",
    "site-css.generated.ts",
  );
  writeFileSync(
    outPath,
    `/**
 * GENERATED — do not edit.
 * Source: co-located \`.css\` files under \`shared/site-css/\`.
 * Regenerate: \`pnpm --filter @rewindom/builtin assemble:module-css\`
 */

${body}
`,
  );
  return {
    outPath,
    exports: Object.keys(assembled),
    bytes: Object.values(assembled).reduce((sum, css) => sum + css.length, 0),
  };
}

/**
 * 手写 `shared/*-css.ts` 会让贡献段 CSS 逃过 assemble（注释不剥、和生产 bundle
 * 脱节）。真源只许 `shared/site-css/*.css`，生成物只许 `site-css.generated.ts`。
 */
export function listHandwrittenModuleCssTs() {
  const hits = [];
  for (const root of [PACKAGE_ROOT, EXTERNAL_MODULES_DIR]) {
    for (const id of listDirIds(root)) {
      const shared = path.join(root, id, "shared");
      if (!existsSync(shared)) continue;
      for (const name of readdirSync(shared)) {
        if (/^[a-z0-9-]+-css\.ts$/u.test(name)) {
          hits.push(path.join(shared, name));
        }
      }
    }
  }
  return hits.sort();
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const handwritten = listHandwrittenModuleCssTs();
  if (handwritten.length > 0) {
    console.error(
      "贡献段 CSS 禁止手写 *-css.ts，请改成 shared/site-css/*.css 再 assemble:\n" +
        handwritten
          .map((file) => `  ${path.relative(REPO_ROOT, file)}`)
          .join("\n"),
    );
    process.exit(1);
  }

  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const ids = requested.length > 0 ? requested : listModuleCssIds();
  for (const moduleId of ids) {
    if (listCssFiles(moduleId).length === 0) {
      console.error(`no shared/site-css/*.css for module "${moduleId}"`);
      process.exit(1);
    }
    const result = writeModuleSiteCssGenerated(moduleId);
    console.log(
      `assembled ${moduleId}/shared/site-css → ${path.relative(process.cwd(), result.outPath)} ` +
        `(${result.exports.join(", ")}, ${result.bytes} B minified)`,
    );
  }
}
