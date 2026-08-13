/**
 * 从共置 `.css` 拼出 `marketing-site-css.generated.ts`。
 *
 * 真源是各段目录下的 `styles.css`，**靠扫目录发现**——加一段放个 `styles.css`
 * 进去就完事，这里没有需要同步的清单。生成物供 Vite 客户端 / esbuild SSR /
 * Vitest 共用（运行时不能 `fs` 读旁路 css，bundle 后路径失效）。
 *
 * 段样式按 type 分开导出，SSR 只发本页真正用到的那几段（见 `loadMarketingSiteCssFor`）。
 * 拆表的前提是段样式互不越界，由 `pnpm check:section-css` 守着。
 *
 *   node packages/builtin/marketing/shared/site-css/assemble.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED_ROOT = path.resolve(HERE, "..");
const SECTIONS_ROOT = path.join(SHARED_ROOT, "sections");
const OUT_PATH = path.join(SHARED_ROOT, "marketing-site-css.generated.ts");

/**
 * 常驻部分：每个页面都要发。
 *
 * `_common` 里是 `.card` / `.grid` / `.sec-head` / `.spec` 这些被四五个段共用的原子，
 * 拆不开也不该按需——按需了反而要算「哪些段用到了它」。
 */
const ALWAYS_SOURCES = [
  "site-css/base.css",
  "site-css/member.css",
  "sections/_common/styles.css",
];

/** 段目录名 = section type。`_` 开头的不是段（`_common`）。 */
export function listSectionCssTypes() {
  return readdirSync(SECTIONS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .filter((type) =>
      readdirSync(path.join(SECTIONS_ROOT, type)).includes("styles.css"),
    )
    .sort();
}

/** 真源清单（常驻 + 各段），相对 `shared/`。 */
export function listMarketingSiteCssSources() {
  return [
    ...ALWAYS_SOURCES,
    ...listSectionCssTypes().map((type) => `sections/${type}/styles.css`),
  ];
}

function minifyCss(css) {
  return esbuild.transformSync(css, { loader: "css", minify: true }).code.trim();
}

function readMinified(rel) {
  return minifyCss(readFileSync(path.join(SHARED_ROOT, rel), "utf8"));
}

/** @returns {{ base: string, sections: Record<string, string> }} */
export function assembleMarketingSiteCss() {
  const base = minifyCss(
    ALWAYS_SOURCES.map((rel) =>
      readFileSync(path.join(SHARED_ROOT, rel), "utf8"),
    ).join("\n"),
  );
  const sections = {};
  for (const type of listSectionCssTypes()) {
    const css = readMinified(`sections/${type}/styles.css`);
    // 只有注释的段（样式全在 `_common`）压完是空的——不进表，省掉一个空条目
    if (css.length > 0) sections[type] = css;
  }
  return { base, sections };
}

function escapeForTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function quote(value) {
  return `\`${escapeForTemplateLiteral(value)}\``;
}

export function writeMarketingSiteCssGenerated() {
  const { base, sections } = assembleMarketingSiteCss();
  const entries = Object.entries(sections)
    .map(([type, css]) => `  ${JSON.stringify(type)}: ${quote(css)},`)
    .join("\n");
  const body = `/**
 * GENERATED — do not edit.
 * Source: co-located \`.css\` files under \`site-css/\` and \`sections/<type>/\`.
 * Regenerate: \`pnpm --filter @rewindom/builtin assemble:marketing-css\`
 */

/** 每页都发：base + 会员 chrome + 段共用原子。 */
export const MARKETING_SITE_CSS_BASE = ${quote(base)};

/** 各内置段自己的样式，按 type 查表。样式全在 \`_common\` 的段不在表内。 */
export const MARKETING_SECTION_CSS: Record<string, string> = {
${entries}
};
`;
  writeFileSync(OUT_PATH, body);
  return {
    outPath: OUT_PATH,
    baseBytes: base.length,
    sectionBytes: Object.values(sections).reduce((sum, s) => sum + s.length, 0),
    sections: Object.keys(sections).length,
    files: listMarketingSiteCssSources().length,
  };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = writeMarketingSiteCssGenerated();
  console.log(
    `assembled ${result.files} css files → ${path.relative(process.cwd(), result.outPath)} ` +
      `(base ${result.baseBytes} B + ${result.sections} sections ${result.sectionBytes} B, minified)`,
  );
}
