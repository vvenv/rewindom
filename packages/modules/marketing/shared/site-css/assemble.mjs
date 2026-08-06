/**
 * 从共置 `.css` 拼出 `marketing-site-css.generated.ts`。
 *
 * 真源是 `sources.json` 列出的各文件；生成物供 Vite 客户端 / esbuild SSR /
 * Vitest 共用（运行时不能 `fs` 读旁路 css，bundle 后路径失效）。
 *
 *   node packages/modules/marketing/shared/site-css/assemble.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED_ROOT = path.resolve(HERE, "..");
const SOURCES_PATH = path.join(HERE, "sources.json");
const OUT_PATH = path.join(SHARED_ROOT, "marketing-site-css.generated.ts");

/** @returns {string[]} paths relative to `shared/` */
export function listMarketingSiteCssSources() {
  return JSON.parse(readFileSync(SOURCES_PATH, "utf8"));
}

/** @returns {string} */
export function assembleMarketingSiteCss() {
  const chunks = [];
  for (const rel of listMarketingSiteCssSources()) {
    const abs = path.join(SHARED_ROOT, rel);
    const css = readFileSync(abs, "utf8").trim();
    if (css.length === 0) continue;
    chunks.push(css);
  }
  return `${chunks.join("\n\n")}\n`;
}

function escapeForTemplateLiteral(value) {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

export function writeMarketingSiteCssGenerated() {
  const css = assembleMarketingSiteCss();
  const body = `/**
 * GENERATED — do not edit.
 * Source: co-located \`.css\` files listed in \`site-css/sources.json\`.
 * Regenerate: \`pnpm --filter @be-water/modules assemble:marketing-css\`
 */

export const MARKETING_SITE_CSS = \`${escapeForTemplateLiteral(css)}\`;
`;
  writeFileSync(OUT_PATH, body);
  return { outPath: OUT_PATH, bytes: css.length, files: listMarketingSiteCssSources().length };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = writeMarketingSiteCssGenerated();
  console.log(
    `assembled ${result.files} css files → ${path.relative(process.cwd(), result.outPath)} (${result.bytes} bytes)`,
  );
}
