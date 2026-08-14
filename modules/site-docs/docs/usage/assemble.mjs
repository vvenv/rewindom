/**
 * 把 `docs/usage/<locale>/*.md` 拼成 `server/usage-docs.generated.ts`。
 *
 * 真源是各语言目录下的 `.md`，**靠扫目录发现**——加一篇丢进去就完事，这里没有需要
 * 同步的清单。生成物是**运行时唯一的读取口**：默认租户的文档库在 `bootstrap` 里初始化，
 * 而 `apps/server` 生产构建是 esbuild 单文件 bundle，`import.meta.url` 指向 `dist/index.js`，
 * 那时任何相对 `fs` 读都会落到不存在的路径上——首次启动（库里还没有已发布文档）直接
 * ENOENT，bootstrap `process.exit(1)`。所以内容必须在构建期内联进 bundle。
 *
 *   node modules/site-docs/docs/usage/assemble.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(HERE, "../../server/usage-docs.generated.ts");

/** 目录名即 locale（必须是 `APP_LOCALES` 的 slug，由生成物的类型标注守着）。 */
function listLocaleDirs() {
  return readdirSync(HERE, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function listDocFiles(locale) {
  return readdirSync(path.join(HERE, locale), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
}

export function listUsageDocSources() {
  return listLocaleDirs().flatMap((locale) =>
    listDocFiles(locale).map((filename) => ({
      locale,
      filename,
      raw: readFileSync(path.join(HERE, locale, filename), "utf8"),
    })),
  );
}

export function assembleUsageDocs() {
  const entries = listUsageDocSources()
    .map(
      (doc) =>
        `  {\n    locale: ${JSON.stringify(doc.locale)},\n    filename: ${JSON.stringify(doc.filename)},\n    raw: ${JSON.stringify(doc.raw)},\n  },`,
    )
    .join("\n");

  return `/**
 * GENERATED — do not edit.
 * Source: \`modules/site-docs/docs/usage/<locale>/*.md\`
 * Regenerate: \`pnpm --filter @rewindom/site-docs assemble:usage-docs\`
 */
import type { AppLocale } from "@rewindom/module-sdk";

export interface UsageDocFile {
  locale: AppLocale;
  /** 文件名即 slug（去 \`.md\`），frontmatter 提供 title/description/category/sort_order。 */
  filename: string;
  raw: string;
}

/** 默认租户文档库的初始内容，按 locale + 文件名排好序。 */
export const USAGE_DOCS: readonly UsageDocFile[] = [
${entries}
];
`;
}

export function writeUsageDocsGenerated() {
  const body = assembleUsageDocs();
  writeFileSync(OUT_PATH, body, "utf8");
  return { outPath: OUT_PATH, bytes: body.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = writeUsageDocsGenerated();
  console.log(
    `assembled usage docs → ${path.relative(process.cwd(), result.outPath)} (${result.bytes} bytes)`,
  );
}
