/**
 * 段样式不得越界。
 *
 * SSR 只发本页用到的那几段 CSS（`loadMarketingSiteCssFor`），这条门禁是它成立的前提：
 * 一个段定义的类，只准这个段自己用。A 段的 HTML 用了 B 段 CSS 里的类，就会在
 * 「有 A 没 B」的页面上裸出来——而且只在特定的段组合下复现，线上很难查。
 *
 * 共用的原子（`.card` / `.grid` / `.btn` …）归 `_common` 与 `site-css/base.css`，
 * 那两处常驻、随便用。
 *
 * 跑法：`pnpm check:section-css`，或跟着 `pnpm test`（见 section-css-scope.test.ts）。
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, "..");
const SECTIONS = path.join(SHARED, "sections");
const VIEWS = path.resolve(SHARED, "../client/components/sections/views");

/** 段目录名 = section type；`_` 开头的不是段。 */
function sectionTypes() {
  return readdirSync(SECTIONS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name)
    .sort();
}

/**
 * 一份 CSS 里**定义**了哪些类。
 *
 * 只认顶格的选择器（`.foo`、`.foo.bar`、`.foo > x`）——嵌套在 `@media` 里的那些
 * 必然也在外层定义过，重复收集没有意义。
 */
function definedClasses(css) {
  const names = new Set();
  for (const line of css.split("\n")) {
    const match = /^\.([a-zA-Z0-9_-]+)/u.exec(line);
    if (match) names.add(match[1]);
  }
  return names;
}

/** 段自己的文件：SSR 的 html.ts、schema，以及客户端那份 React 视图。 */
function ownFiles(type) {
  const files = [];
  const dir = path.join(SECTIONS, type);
  for (const name of readdirSync(dir)) {
    if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      files.push(path.join(dir, name));
    }
  }
  const view = path.join(VIEWS, `${type}.tsx`);
  if (existsSync(view)) files.push(view);
  return files;
}

const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu;
const STRINGS =
  /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/gu;

/**
 * 一份源码里用到的 class 名。
 *
 * 只认**字符串字面量**里的词。整份文件扫词会把散文注释也算进去（`page-header`
 * 的注释里提了一句 "不以 hero 开场"，那不是引用），所以先剥注释再只看字面量。
 * `grp-span-${n}` 这类拼出来的漏掉了没关系——那些都是 base.css 的常驻类。
 */
function referencedClasses(source) {
  const text = source.replace(COMMENTS, " ");
  const names = new Set();
  for (const match of text.matchAll(STRINGS)) {
    const literal = match[1] ?? match[2] ?? match[3] ?? "";
    for (const token of literal.split(/[^a-zA-Z0-9_-]+/u)) {
      if (token) names.add(token);
    }
  }
  return names;
}

/** @returns {string[]} 人话写的违规清单；空数组 = 干净。 */
export function findSectionCssViolations() {
  const types = sectionTypes();
  const failures = [];
  const owners = new Map(); // class -> 定义它的段

  for (const type of types) {
    const cssPath = path.join(SECTIONS, type, "styles.css");
    if (!existsSync(cssPath)) {
      failures.push(
        `sections/${type}/ 缺 styles.css（样式全在 _common 也要留个说明文件）`,
      );
      continue;
    }
    for (const cls of definedClasses(readFileSync(cssPath, "utf8"))) {
      owners.set(cls, type);
    }
  }

  for (const type of types) {
    const used = new Set();
    for (const file of ownFiles(type)) {
      for (const cls of referencedClasses(readFileSync(file, "utf8"))) {
        used.add(cls);
      }
    }
    for (const [cls, owner] of owners) {
      if (owner === type) continue;
      if (used.has(cls)) {
        failures.push(
          `sections/${type} 用了 .${cls}，但它定义在 sections/${owner}/styles.css —— ` +
            `把它挪进 sections/_common/styles.css，或在 ${type} 里自带一份`,
        );
      }
    }
  }

  return failures;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const failures = findSectionCssViolations();
  if (failures.length > 0) {
    console.error("✗ 段样式越界（按需发 CSS 会在这些组合下丢样式）：\n");
    for (const line of failures) console.error(`  - ${line}`);
    process.exit(1);
  }
  console.log(`✓ ${sectionTypes().length} 个段的样式互不越界`);
}
