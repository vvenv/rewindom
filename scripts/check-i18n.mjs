#!/usr/bin/env node
/**
 * 客户端文案门禁（i18n gate）
 *
 * 背景：namespace 改名或漏加 key，`build` / `typecheck` / `lint` **一个都不会报错**——
 * i18next 找不到 key 时原样把 key 吐到界面上（`returnNull: false`，无 `saveMissing`）。
 * 上线后才由人肉发现「界面上出现了 widget.viewAll」，这个脚本就是把它左移到 CI。
 *
 * 三类检查：
 *   1. bundle 自洽：`ns` 全局唯一；每个 bundle 对 `APP_LOCALES` 的每种语言都有 locales 文件；
 *      同一 bundle 内各语言的 key 集合完全一致（漏翻会退化成 fallback，静默换语言）。
 *   2. 调用点：客户端源码里字面量 `t("...")` 的 key 必须在其 namespace 里存在。
 *      namespace 按「调用点之前最近的一次 `useTranslation(...)`」解析（同一文件里多个组件
 *      各自持有不同 ns 是常态，按文件取第一个会误报）。
 *   3. `ns:key` 字面量：nav / dashboard 等声明式清单里的 `"todo:nav.label"` 这类跨 ns 引用
 *      （由 `translateAppNavSections` 延迟解析，编译期无人校验）。
 *
 * 无法静态求值的 key（模板字符串、变量拼接）跳过，`--verbose` 可列出。
 * 带 `defaultValue` 的调用不算缺失——那是显式声明的兜底。
 *
 *   node scripts/check-i18n.mjs            # 检查（CI / pre-push 用）
 *   node scripts/check-i18n.mjs --verbose  # 附带列出跳过的动态 key
 *   node scripts/check-i18n.mjs --json     # 机器可读输出
 *
 * 退出码：0 = 无问题；1 = 存在缺失/不一致。
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 壳层自带的 namespace，locales 直接按 `<locale>/<ns>.json` 平铺。 */
const SHELL_LOCALES_DIR = path.join(
  ROOT,
  "packages",
  "client-kit",
  "src",
  "i18n",
  "locales",
);
/** 模块 bundle：`<dir>/client/i18n.ts` + `<dir>/client/locales/<locale>.json`。 */
const MODULE_ROOTS = [
  path.join(ROOT, "packages", "builtin"),
  path.join(ROOT, "modules"),
];
/** 扫描调用点的源码根目录（只看客户端；server 有独立的 message catalog）。 */
const SOURCE_ROOTS = [
  path.join(ROOT, "apps", "client", "src"),
  path.join(ROOT, "packages", "client-kit", "src"),
  ...MODULE_ROOTS,
];
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".turbo",
  "server",
]);
/** i18next 的 `defaultNS`（见 client-kit/src/i18n/setup.ts）。 */
const DEFAULT_NS = "common";
/** i18next v4 复数后缀：`count_one` / `count_other` 等都算 `count` 存在。 */
const PLURAL_SUFFIXES = ["_zero", "_one", "_two", "_few", "_many", "_other"];

const args = new Set(process.argv.slice(2));
const AS_JSON = args.has("--json");
const VERBOSE = args.has("--verbose");

const read = (p) => readFileSync(p, "utf8");
const rel = (p) => path.relative(ROOT, p);

// ---------------------------------------------------------------- 收集 locales

/** 从 packages/shared/src/locale.ts 读 APP_LOCALES，避免新增语言后这里漏改。 */
function loadLocales() {
  const src = read(path.join(ROOT, "packages", "shared", "src", "locale.ts"));
  const block = src.slice(
    src.indexOf("export const APP_LOCALES"),
    src.indexOf("] as const"),
  );
  const slugs = [...block.matchAll(/slug:\s*"([^"]+)"/gu)].map((m) => m[1]);
  if (slugs.length === 0) {
    throw new Error("未能从 packages/shared/src/locale.ts 解析出 APP_LOCALES");
  }
  return slugs;
}

/** 把嵌套 JSON 摊平成 key 集合；中间节点也算 key（`t("widget")` 取整棵子树是合法用法）。 */
function flattenKeys(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = `${prefix}${k}`;
    out.add(key);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flattenKeys(v, `${key}.`, out);
    }
  }
  return out;
}

function listDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(dir, e.name));
}

/**
 * 发现所有文案包 → `{ ns, source, byLocale: Map<locale, {file, keys}> }`。
 * 壳层（common / shell）与模块 bundle 的目录布局不同，分别处理。
 */
function collectBundles(locales, errors) {
  const bundles = new Map();

  const put = (ns, source, locale, file) => {
    let bundle = bundles.get(ns);
    if (!bundle) {
      bundle = { ns, source, byLocale: new Map() };
      bundles.set(ns, bundle);
    } else if (bundle.source !== source) {
      errors.push({
        kind: "duplicate-ns",
        ns,
        message: `namespace "${ns}" 被两处同时声明：${bundle.source} 与 ${source}（后注册的会整包覆盖前者）`,
      });
      return;
    }
    bundle.byLocale.set(locale, {
      file,
      keys: flattenKeys(JSON.parse(read(file))),
    });
  };

  // 壳层：locales/<locale>/<ns>.json
  for (const localeDir of listDirs(SHELL_LOCALES_DIR)) {
    const locale = path.basename(localeDir);
    for (const entry of readdirSync(localeDir)) {
      if (!entry.endsWith(".json")) continue;
      const ns = entry.slice(0, -".json".length);
      put(ns, rel(SHELL_LOCALES_DIR), locale, path.join(localeDir, entry));
    }
  }

  // 模块：<pkg>/client/i18n.ts 声明 ns，<pkg>/client/locales/<locale>.json 提供 key
  for (const root of MODULE_ROOTS) {
    for (const pkgDir of listDirs(root)) {
      const i18nFile = path.join(pkgDir, "client", "i18n.ts");
      if (!existsSync(i18nFile)) continue;
      const ns = /\bns:\s*"([^"]+)"/u.exec(read(i18nFile))?.[1];
      if (!ns) {
        errors.push({
          kind: "no-ns",
          file: rel(i18nFile),
          message: `${rel(i18nFile)} 未声明 \`ns: "..."\``,
        });
        continue;
      }
      const localesDir = path.join(pkgDir, "client", "locales");
      if (!existsSync(localesDir)) {
        errors.push({
          kind: "no-locales",
          ns,
          message: `${rel(i18nFile)} 声明了 ns "${ns}"，但缺少 ${rel(localesDir)}/`,
        });
        continue;
      }
      for (const entry of readdirSync(localesDir)) {
        if (!entry.endsWith(".json")) continue;
        put(
          ns,
          rel(i18nFile),
          entry.slice(0, -".json".length),
          path.join(localesDir, entry),
        );
      }
    }
  }

  // 语言齐备 + key 对齐
  for (const bundle of bundles.values()) {
    for (const locale of locales) {
      if (!bundle.byLocale.has(locale)) {
        errors.push({
          kind: "missing-locale",
          ns: bundle.ns,
          message: `ns "${bundle.ns}"（${bundle.source}）缺少 ${locale} 文案文件`,
        });
      }
    }
    const union = new Set();
    for (const { keys } of bundle.byLocale.values()) {
      for (const k of keys) union.add(k);
    }
    for (const [locale, { file, keys }] of bundle.byLocale) {
      const missing = [...union].filter((k) => !keys.has(k)).sort();
      if (missing.length > 0) {
        errors.push({
          kind: "key-parity",
          ns: bundle.ns,
          locale,
          file: rel(file),
          keys: missing,
          message: `${rel(file)} 相比同 bundle 其它语言缺 ${missing.length} 个 key：${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`,
        });
      }
    }
  }

  return bundles;
}

/** key 在该 ns 下是否可解析（含复数后缀变体）。 */
function hasKey(bundles, ns, key) {
  const bundle = bundles.get(ns);
  if (!bundle) return false;
  for (const { keys } of bundle.byLocale.values()) {
    if (keys.has(key)) return true;
    if (PLURAL_SUFFIXES.some((s) => keys.has(`${key}${s}`))) return true;
  }
  return false;
}

// ---------------------------------------------------------------- 扫描调用点

function collectSourceFiles() {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (
        /\.tsx?$/u.test(entry.name) &&
        !/\.(test|spec)\.tsx?$/u.test(entry.name)
      ) {
        files.push(full);
      }
    }
  };
  for (const root of SOURCE_ROOTS) {
    if (!existsSync(root) || !statSync(root).isDirectory()) continue;
    walk(root);
  }
  return files;
}

/** 解析 `useTranslation` 的第一个实参为 namespace 数组。 */
function parseNamespaceArg(raw) {
  if (!raw) return [DEFAULT_NS];
  const list = [...raw.matchAll(/["']([^"']+)["']/gu)].map((m) => m[1]);
  return list.length > 0 ? list : [DEFAULT_NS];
}

/** 从解构 pattern 里取出 `t` 的实际变量名（支持 `t: tCommon` 重命名）。 */
function parseTranslatorAlias(pattern) {
  const renamed = /(?:^|,)\s*t\s*:\s*([A-Za-z_$][\w$]*)/u.exec(pattern);
  if (renamed) return renamed[1];
  return /(?:^|,)\s*t\s*(?:,|$)/u.test(pattern) ? "t" : null;
}

/**
 * 收集文件里所有 `const { t } = useTranslation(...)` 作用域，按出现位置排序。
 * 查一个调用点时取它之前最近的同名 alias 声明——同一文件里多个组件各自持有
 * 不同 ns 是常态（TopBar / Sidebar / UserSheet 都是），按文件取第一个必然误报。
 */
function buildScopes(src) {
  const scopes = [];
  const re =
    /(?:const|let|var)\s*\{([^}]*)\}\s*=\s*useTranslation\(\s*(\[[^\]]*\]|"[^"]*"|'[^']*')?/gu;
  let m;
  while ((m = re.exec(src)) !== null) {
    const alias = parseTranslatorAlias(m[1]);
    if (!alias) continue;
    scopes.push({
      index: m.index,
      alias,
      namespaces: parseNamespaceArg(m[2]),
    });
  }
  return scopes;
}

/** 取调用点之前最近的同名 alias 声明。 */
function resolveScope(scopes, alias, index) {
  let found = null;
  for (const scope of scopes) {
    if (scope.alias !== alias) continue;
    if (scope.index > index) break;
    found = scope;
  }
  return found;
}

/** 极简的「取到配对右括号为止」——用来读 `t(...)` 的实参，够解析 options 对象即可。 */
function sliceCallArgs(src, openParenIndex) {
  let depth = 0;
  for (let i = openParenIndex; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return src.slice(openParenIndex + 1, i);
    }
  }
  return src.slice(openParenIndex + 1);
}

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

function scanCallSites(bundles, files, errors, skipped) {
  const nsNames = new Set(bundles.keys());

  for (const file of files) {
    const src = read(file);
    if (!src.includes("useTranslation") && !src.includes("i18n.t(")) {
      // 仍可能有 `ns:key` 声明式引用，继续走第 3 类检查
      scanNamespacedLiterals(src, file, bundles, nsNames, errors);
      continue;
    }
    const scopes = buildScopes(src);
    const aliases = new Set(scopes.map((s) => s.alias));

    // `t(` / `tCommon(` / `i18n.t(`
    const callRe = /(?<![\w$.])(i18n\.t|[A-Za-z_$][\w$]*)\s*\(/gu;
    let m;
    while ((m = callRe.exec(src)) !== null) {
      const name = m[1];
      const isI18nT = name === "i18n.t";
      if (!isI18nT && !aliases.has(name)) continue;

      const open = m.index + m[0].length - 1;
      const argsSrc = sliceCallArgs(src, open);
      const literal = /^\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/u.exec(argsSrc);
      const line = lineOf(src, m.index);

      if (!literal) {
        skipped.push({ file: rel(file), line, snippet: argsSrc.slice(0, 60) });
        continue;
      }
      const rawKey = literal[2];
      const options = argsSrc.slice(literal[0].length);
      if (/\bdefaultValue\s*:/u.test(options)) continue;

      let candidates;
      let key = rawKey;
      const explicitNs = /\bns\s*:\s*["']([^"']+)["']/u.exec(options)?.[1];
      if (rawKey.includes(":")) {
        const [prefix, ...restParts] = rawKey.split(":");
        candidates = [prefix];
        key = restParts.join(":");
      } else if (explicitNs) {
        candidates = [explicitNs];
      } else if (isI18nT) {
        candidates = [DEFAULT_NS];
      } else {
        const scope = resolveScope(scopes, name, m.index);
        if (!scope) continue;
        candidates = scope.namespaces;
      }

      // 只校验我们认识的 namespace；未知前缀多半不是文案引用（如 `http://`）
      const known = candidates.filter((ns) => nsNames.has(ns));
      if (known.length === 0) continue;
      if (known.some((ns) => hasKey(bundles, ns, key))) continue;

      errors.push({
        kind: "missing-key",
        file: rel(file),
        line,
        ns: known.join(" | "),
        key,
        message: `${rel(file)}:${line} → ${known.join(" | ")}:${key} 不存在`,
      });
    }

    scanNamespacedLiterals(src, file, bundles, nsNames, errors);
  }
}

/**
 * `"todo:nav.label"` 这类跨 ns 字面量引用（nav / dashboard 清单里最常见）。
 * 只认已注册的 ns 前缀，且要求 key 形如点分标识符，避免把 URL / CSS 值误判成文案。
 */
function scanNamespacedLiterals(src, file, bundles, nsNames, errors) {
  const re =
    /["']([a-z][a-z0-9-]*):([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)["']/gu;
  let m;
  while ((m = re.exec(src)) !== null) {
    const [, ns, key] = m;
    if (!nsNames.has(ns)) continue;
    if (hasKey(bundles, ns, key)) continue;
    errors.push({
      kind: "missing-key",
      file: rel(file),
      line: lineOf(src, m.index),
      ns,
      key,
      message: `${rel(file)}:${lineOf(src, m.index)} → ${ns}:${key} 不存在`,
    });
  }
}

// ---------------------------------------------------------------- 主流程

const errors = [];
const skipped = [];
const locales = loadLocales();
const bundles = collectBundles(locales, errors);
const files = collectSourceFiles();
scanCallSites(bundles, files, errors, skipped);

// 同一 key 可能被两条规则各命中一次（如 `t("todo:x")`），去重
const seen = new Set();
const unique = errors.filter((e) => {
  const id = `${e.kind}|${e.file ?? ""}|${e.line ?? ""}|${e.ns ?? ""}|${e.key ?? ""}|${e.message}`;
  if (seen.has(id)) return false;
  seen.add(id);
  return true;
});

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        ok: unique.length === 0,
        locales,
        namespaces: [...bundles.keys()].sort(),
        scannedFiles: files.length,
        skippedDynamicKeys: skipped.length,
        errors: unique,
      },
      null,
      2,
    ),
  );
  process.exit(unique.length === 0 ? 0 : 1);
}

console.log(
  `i18n：${bundles.size} 个 namespace × ${locales.join(" / ")}，扫描 ${files.length} 个客户端源文件`,
);

if (VERBOSE && skipped.length > 0) {
  console.log(`\n跳过 ${skipped.length} 处动态 key（无法静态求值）：`);
  for (const s of skipped.slice(0, 40)) {
    console.log(`  ${s.file}:${s.line}  t(${s.snippet.trim()}…`);
  }
  if (skipped.length > 40) console.log(`  … 还有 ${skipped.length - 40} 处`);
}

if (unique.length === 0) {
  console.log("✓ 文案齐备：各语言 key 对齐，调用点无缺失 key");
  process.exit(0);
}

const byKind = new Map();
for (const e of unique) {
  if (!byKind.has(e.kind)) byKind.set(e.kind, []);
  byKind.get(e.kind).push(e);
}
const KIND_LABEL = {
  "duplicate-ns": "namespace 冲突",
  "no-ns": "未声明 namespace",
  "no-locales": "缺少 locales 目录",
  "missing-locale": "缺少语言文件",
  "key-parity": "语言间 key 不对齐",
  "missing-key": "调用点 key 缺失",
};
for (const [kind, list] of byKind) {
  console.error(`\n✗ ${KIND_LABEL[kind] ?? kind}（${list.length}）：`);
  for (const e of list) console.error(`  ${e.message}`);
}
console.error(
  `\n共 ${unique.length} 处问题。缺失的 key 会被 i18next 原样渲染到界面上（如 widget.viewAll）。`,
);
process.exit(1);
