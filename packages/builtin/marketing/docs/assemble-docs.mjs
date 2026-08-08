/**
 * 从共置 `.md` 文件拼出 `docs.generated.ts`。
 *
 * 真源是 `docs/` 下的 `*.md`——一篇平台文档一个文件，**靠扫目录发现**：
 * 加一篇丢个 `.md` 进来就完事，这里没有需要同步的清单。
 *
 * 为什么不直接 `import "./x.md?raw"`：SSR 走 esbuild bundle（不是 Vite），`?raw` 与
 * `import.meta.glob` 在 server bundle 里都不工作。所以跟 CSS 同一套口径——构建期把
 * `.md` 读出来、压进一个生成 `.ts`，Vite 客户端 / esbuild SSR / Vitest 三端共用。
 *
 * 文件名即 slug（`install-external-module.md` → slug `install-external-module`）；
 * 标题与简述写在前置 frontmatter（`---\ntitle: ...\ndescription: ...\n---`），正文是
 * frontmatter 之后的全部内容。frontmatter 可省略——缺省时 title=slug、description=""。
 *
 *   node packages/builtin/marketing/docs/assemble-docs.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(HERE, "docs.generated.ts");

function escapeForTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function quote(value) {
  return `\`${escapeForTemplateLiteral(value)}\``;
}

/**
 * 解析一篇 `.md`：拆出 frontmatter（title / description）与正文。
 * 没有 frontmatter 就 title=slug、description=""、body=全文。
 */
function parseMarkdownDoc(slug, raw) {
  let title = slug;
  let description = "";
  let body = raw;
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    body = raw.slice(fmMatch[0].length);
    for (const line of fmMatch[1].split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      const val = m[2].trim();
      if (key === "title") title = val;
      else if (key === "description") description = val;
    }
  }
  return { slug, title, description, markdown: body.trim() };
}

/** 扫 `docs/*.md`（排除生成物与本脚本），按 slug 排序保证生成物稳定。 */
function listPlatformDocs() {
  return readdirSync(HERE, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort()
    .map((file) => {
      const slug = file.slice(0, -3);
      return parseMarkdownDoc(slug, readFileSync(path.join(HERE, file), "utf8"));
    });
}

/** @returns {{ docs: Array<{slug:string;title:string;description:string;markdown:string}> }} */
export function assemblePlatformDocs() {
  return { docs: listPlatformDocs() };
}

export function writePlatformDocsGenerated() {
  const { docs } = assemblePlatformDocs();
  const entries = docs
    .map(
      (d) =>
        `  {\n    slug: ${quote(d.slug)},\n    title: ${quote(d.title)},\n    description: ${quote(d.description)},\n    markdown: ${quote(d.markdown)},\n  },`,
    )
    .join("\n");
  const body = `/**
 * GENERATED — do not edit.
 * Source: co-located \`*.md\` files under \`docs/\` (filename = slug, frontmatter = title/description).
 * Regenerate: \`pnpm --filter @be-water/builtin assemble:marketing-docs\`
 */

/**
 * 平台文档原始数据（按 slug 排序）。类型与派生 API 见 \`./index.ts\`——
 * 生成物只管数据，不管展示口径。
 */
export const PLATFORM_DOCS_RAW: ReadonlyArray<{
  slug: string;
  title: string;
  description: string;
  markdown: string;
}> = [
${entries}
];
`;
  writeFileSync(OUT_PATH, body);
  return { outPath: OUT_PATH, count: docs.length };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = writePlatformDocsGenerated();
  console.log(
    `assembled ${result.count} platform docs → ${path.relative(process.cwd(), result.outPath)}`,
  );
}
