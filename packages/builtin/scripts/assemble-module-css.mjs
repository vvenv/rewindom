/**
 * 从各模块共置的 `.css` 拼出 `<module>/shared/site-css.generated.ts`。
 *
 * marketing 内置段的样式在构建期打进 `MARKETING_SECTION_CSS`；**贡献段**（site-member、
 * site-billing、billing 这类别的模块注册进官网的段）进不了那次打包，只能随注册把 CSS
 * 字符串交给 marketing。字符串必须是构建期生成物而不是运行时 `fs` 读——生产 server 是
 * 单文件 esbuild bundle，旁路 `.css` 的相对路径在 bundle 后失效；同一份常量还要进
 * 浏览器 bundle（SPA / 编辑器预览），浏览器里更没有 `fs`。
 *
 * 真源**靠扫目录发现**：模块在 `shared/site-css/` 下放 `<name>.css`，就会生成导出
 * `<NAME>_CSS`（kebab-case → SCREAMING_SNAKE）。`@import "./x.css"` 会被内联，用于
 * 「账户页自带认证卡样式」这类组合。esbuild minify 顺带剥掉设计注释——源文件里可以
 * 放心写长注释，不会发给访客。
 *
 *   node packages/builtin/scripts/assemble-module-css.mjs
 */

import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** marketing 有自己的 assemble（site-css/assemble.mjs），不归这里管。 */
const SKIP_DIRS = new Set(["node_modules", "scripts", "marketing"]);

function cssDirOf(moduleId) {
  return path.join(PACKAGE_ROOT, moduleId, "shared", "site-css");
}

function listCssFiles(moduleId) {
  const dir = cssDirOf(moduleId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".css"))
    .sort();
}

/** 带 `shared/site-css/*.css` 的模块目录名。 */
export function listModuleCssIds() {
  return readdirSync(PACKAGE_ROOT, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !SKIP_DIRS.has(entry.name),
    )
    .map((entry) => entry.name)
    .filter((id) => listCssFiles(id).length > 0)
    .sort();
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
  const outPath = path.join(PACKAGE_ROOT, moduleId, "shared", "site-css.generated.ts");
  writeFileSync(
    outPath,
    `/**
 * GENERATED — do not edit.
 * Source: co-located \`.css\` files under \`shared/site-css/\`.
 * Regenerate: \`pnpm --filter @be-water/builtin assemble:module-css\`
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

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  for (const moduleId of listModuleCssIds()) {
    const result = writeModuleSiteCssGenerated(moduleId);
    console.log(
      `assembled ${moduleId}/shared/site-css → ${path.relative(process.cwd(), result.outPath)} ` +
        `(${result.exports.join(", ")}, ${result.bytes} B minified)`,
    );
  }
}
