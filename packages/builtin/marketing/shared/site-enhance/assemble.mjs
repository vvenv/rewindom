/**
 * 把 `client/enhance/main.ts` **加上各模块贡献的 enhance** 打成 IIFE，
 * 写入 `site-enhance.generated.ts`。
 *
 * 公开站只发一个脚本（一次请求、一份长缓存），所以贡献方的交互不能各自成包；但定义
 * 也不该因此回流到 marketing——模块在 `client/enhance/index.ts` 里导出
 * `enhanceSite(ctx)`，**靠扫目录发现**，这里拼一个构建期的虚拟入口把它们串起来：
 *
 *   import { enhanceSite as e0 } from "<模块>/client/enhance/index.ts";
 *   import { bootSiteEnhance } from "<marketing>/client/enhance/main.ts";
 *   bootSiteEnhance([e0]);
 *
 * 入口是 esbuild 的 `stdin`、走绝对路径，生成物里只有一串 JS 字符串——marketing 的
 * TS 源码里没有任何指向业务模块的 import，依赖图上仍只有「业务模块 → marketing」。
 *
 *   node packages/builtin/marketing/shared/site-enhance/assemble.mjs
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED_ROOT = path.resolve(HERE, "..");
const MODULE_ROOT = path.resolve(SHARED_ROOT, "..");
const BUILTIN_ROOT = path.resolve(MODULE_ROOT, "..");
const REPO_ROOT = path.resolve(BUILTIN_ROOT, "../..");
const EXTERNAL_MODULES_DIR = path.join(REPO_ROOT, "modules");
const ENTRY = path.join(MODULE_ROOT, "client", "enhance", "main.ts");
const OUT_PATH = path.join(SHARED_ROOT, "site-enhance.generated.ts");

/** marketing 自己的 enhance 是入口，不算贡献方。 */
const SKIP_DIRS = new Set(["node_modules", "scripts", "marketing"]);

function listContributors(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SKIP_DIRS.has(entry.name))
    .map((entry) =>
      path.join(root, entry.name, "client", "enhance", "index.ts"),
    )
    .filter((file) => existsSync(file))
    .sort();
}

/** 贡献方 enhance 入口（内置模块 + 外部模块），路径排序保证生成物稳定。 */
export function listSiteEnhanceContributors() {
  return [
    ...listContributors(BUILTIN_ROOT),
    ...listContributors(EXTERNAL_MODULES_DIR),
  ];
}

/** 构建期虚拟入口：先 import 贡献方，再启动 marketing 的 boot。 */
function buildEntryContents(contributors) {
  const imports = contributors.map(
    (file, index) =>
      `import { enhanceSite as e${index} } from ${JSON.stringify(file)};`,
  );
  return [
    ...imports,
    `import { bootSiteEnhance } from ${JSON.stringify(ENTRY)};`,
    `bootSiteEnhance([${contributors.map((_, index) => `e${index}`).join(", ")}]);`,
    "",
  ].join("\n");
}

function escapeForTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

export async function writeSiteEnhanceGenerated() {
  const contributors = listSiteEnhanceContributors();
  const result = await esbuild.build({
    stdin: {
      contents: buildEntryContents(contributors),
      resolveDir: REPO_ROOT,
      sourcefile: "site-enhance-entry.ts",
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    minify: true,
    legalComments: "none",
  });
  const js = result.outputFiles[0]?.text ?? "";
  const hash = createHash("sha256").update(js).digest("hex").slice(0, 12);
  const sources = [
    "client/enhance/main.ts",
    ...contributors.map((file) => path.relative(REPO_ROOT, file)),
  ];
  const body = `/**
 * GENERATED — do not edit.
 * Sources:
${sources.map((source) => ` *   - \`${source}\``).join("\n")}
 * Regenerate: \`pnpm --filter @rewindom/builtin assemble:site-enhance\`
 */

export const SITE_ENHANCE_JS = \`${escapeForTemplateLiteral(js)}\`;
export const SITE_ENHANCE_HASH = ${JSON.stringify(hash)};
`;
  writeFileSync(OUT_PATH, body);
  return { outPath: OUT_PATH, bytes: js.length, hash, contributors };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = await writeSiteEnhanceGenerated();
  console.log(
    `assembled site-enhance → ${path.relative(process.cwd(), result.outPath)} (${result.bytes} bytes, hash=${result.hash}, contributors=${result.contributors.length})`,
  );
}
