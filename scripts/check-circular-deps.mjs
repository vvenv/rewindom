#!/usr/bin/env node
/**
 * 循环依赖检测（棘轮门禁 / ratchet gate）
 *
 * 扫描 workspace 内所有 `@be-water/*` 包的运行时依赖（package.json 的 `dependencies`），
 * 用 Tarjan 求强连通分量（SCC）；一条依赖边若两端落在同一个 >1 成员的 SCC 内，
 * 即为「环上边」（cyclic edge）——它一定参与了至少一个循环。
 *
 * 包分层（scripts/module-contexts.json）：把包分到 app / modules / lib / test 等层。
 * **同层内部的环视为内聚、放行；只把跨层的环上边纳入守护**。
 * 模块之间的环已不在此守护范围（同属 @be-water/builtin 一个包），由
 * packages/builtin/eslint.config.js 的 import-x/no-cycle 做文件级检测。
 *
 * 语义（关键）：不追求「一次清零」，而是把现存的**跨上下文环上边**记入 baseline，
 * CI 只对「新增的跨上下文环上边」报错——baseline 只能缩不能涨。
 * 用边而非整组做基线，才能在巨型 SCC 内部继续拦住新增耦合（按组做会退化成「允许一切」）。
 *
 *   node scripts/check-circular-deps.mjs                 # 检查（CI / pre-push 用）
 *   node scripts/check-circular-deps.mjs --update-baseline  # 还债后重写基线
 *   node scripts/check-circular-deps.mjs --json          # 机器可读输出
 *
 * 退出码：0 = 无新增环；1 = 检测到新增/变大的环。
 *
 * 依赖口径：默认只看 `dependencies`（真正决定「即插即用/能否单独启用」的运行时耦合）。
 * devDependencies（如 client-test / server-test）不计入，避免测试脚手架造成的假环。
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = path.join(ROOT, "scripts", "circular-deps-baseline.json");
const CONTEXTS_PATH = path.join(ROOT, "scripts", "module-contexts.json");
const WORKSPACE_GLOBS = ["apps", "packages", "modules"];
/** 本仓的包分属两个 scope：@be-water/*（模板设施，与上游同名）与 @be-water/*（本产品业务）。 */
const SCOPE_PREFIXES = ["@be-water/", "@be-water/"];
/** 依赖种类：只有运行时耦合会阻碍「单独启用某模块」 */
const DEP_FIELDS = ["dependencies"];

const args = new Set(process.argv.slice(2));
const UPDATE = args.has("--update-baseline");
const AS_JSON = args.has("--json");

/** 加载限界上下文映射；返回 ctxOf(pkgName, dir?) -> 上下文名（未列出的用 default） */
function loadContexts() {
  if (!existsSync(CONTEXTS_PATH)) {
    return { ctxOf: () => "infra", defaultCtx: "infra" };
  }
  const data = JSON.parse(readFileSync(CONTEXTS_PATH, "utf8"));
  const defaultCtx = data.default ?? "infra";
  const byPkg = new Map();
  for (const [ctx, members] of Object.entries(data.contexts ?? {})) {
    for (const m of members) byPkg.set(m, ctx);
  }
  return {
    ctxOf: (name, dir) => {
      // 1. 显式列出的包名优先
      if (byPkg.has(name)) return byPkg.get(name);
      // 2. modules/ 下的包归 external 上下文（无需手工登记）
      if (dir && dir.startsWith("modules/"))
        return "external";
      // 3. 回落到默认上下文
      return defaultCtx;
    },
    defaultCtx,
  };
}

/** 读取 workspace 内所有本地包，返回 name -> { name, dir, deps:Set<localName> } */
function loadGraph() {
  const byName = new Map();
  const dirs = [];
  for (const glob of WORKSPACE_GLOBS) {
    const base = path.join(ROOT, glob);
    if (!existsSync(base)) continue;
    // 目录本身就是一个包（防御：glob 根直接是包的情形）
    const selfPkg = path.join(base, "package.json");
    if (existsSync(selfPkg)) {
      dirs.push(selfPkg);
      continue;
    }
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pkgPath = path.join(base, entry.name, "package.json");
      if (existsSync(pkgPath)) dirs.push(pkgPath);
    }
  }

  const raw = [];
  for (const pkgPath of dirs) {
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch (err) {
      throw new Error(
        `无法解析 ${path.relative(ROOT, pkgPath)}: ${err.message}`,
      );
    }
    if (!pkg.name) continue;
    raw.push({ pkg, pkgPath });
    byName.set(pkg.name, {
      name: pkg.name,
      dir: path.relative(ROOT, path.dirname(pkgPath)),
      deps: new Set(),
    });
  }

  // 只保留指向本地 @be-water/* 包的边
  for (const { pkg } of raw) {
    const node = byName.get(pkg.name);
    for (const field of DEP_FIELDS) {
      const deps = pkg[field];
      if (!deps) continue;
      for (const dep of Object.keys(deps)) {
        if (dep === pkg.name) continue; // 忽略自引用
        if (!SCOPE_PREFIXES.some((p) => dep.startsWith(p))) continue;
        if (!byName.has(dep)) continue; // 只算 workspace 内的包
        node.deps.add(dep);
      }
    }
  }
  return byName;
}

/** 一条边的稳定字符串键 */
function edgeKey(u, v) {
  return `${u} -> ${v}`;
}

/**
 * 求所有「环上边」。返回 { edges:Set<string>, sccOf:Map<name,repr> }：
 * edges 是 "u -> v" 集合（u、v 同处一个 size>1 的 SCC）；sccOf 供报告时判断同组。
 */
function findCyclicEdges(graph) {
  const sccs = findCyclicSccs(graph);
  const sccOf = new Map();
  for (const comp of sccs) {
    const repr = comp[0];
    for (const m of comp) sccOf.set(m, repr);
  }
  const edges = new Set();
  for (const [name, node] of graph) {
    const g = sccOf.get(name);
    if (g === undefined) continue;
    for (const dep of node.deps) {
      if (sccOf.get(dep) === g) edges.add(edgeKey(name, dep));
    }
  }
  return { edges, sccOf, sccs };
}

/** Tarjan SCC；返回 size>1 的循环分量（成员名排序数组） */
function findCyclicSccs(graph) {
  let index = 0;
  const idx = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const sccs = [];

  const nodes = [...graph.keys()];

  function strongconnect(v) {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v).deps) {
      if (!idx.has(w)) {
        strongconnect(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v), idx.get(w)));
      }
    }
    if (low.get(v) === idx.get(v)) {
      const comp = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1) sccs.push(comp.sort());
    }
  }

  for (const v of nodes) if (!idx.has(v)) strongconnect(v);
  return sccs.sort((a, b) => a[0].localeCompare(b[0]));
}

/** 找一条真正穿过边 u→v 的回路：v 沿图走回 u，返回 [u, v, ..., u] */
function cycleThroughEdge(graph, u, v) {
  const prev = new Map([[v, null]]);
  const queue = [v];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === u) break;
    for (const w of graph.get(cur).deps) {
      if (!prev.has(w)) {
        prev.set(w, cur);
        queue.push(w);
      }
    }
  }
  if (!prev.has(u)) return [u, v]; // 理论上不会发生（同 SCC 必有回路）
  const back = [];
  for (let n = u; n !== null; n = prev.get(n)) back.push(n);
  return [u, ...back.reverse()];
}

function short(name) {
  return SCOPE_PREFIXES.reduce((acc, p) => acc.replace(p, ""), name);
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return new Set();
  const data = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  return new Set(data.edges ?? []);
}

function writeBaseline(edges) {
  const payload = {
    _comment:
      "循环依赖基线（棘轮，上下文感知）。每项是一条「跨上下文环上依赖边」 u -> v（上下文内部的环不计）。" +
      "CI 只允许基线内的跨上下文环上边，禁止新增。还债后运行 `--update-baseline` 重写本文件（应越来越少）。",
    _generated: new Date().toISOString().slice(0, 10),
    edges: [...edges].sort(),
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + "\n");
}

// —— 主流程 ——
const graph = loadGraph();
const { ctxOf } = loadContexts();
const { edges: allCyclicEdges, sccOf, sccs } = findCyclicEdges(graph);

// 只守跨上下文的环上边；同一上下文内部的环视为内聚、放行。
const edgeCrossesContext = (e) => {
  const [u, v] = e.split(" -> ");
  return ctxOf(u, graph.get(u)?.dir) !== ctxOf(v, graph.get(v)?.dir);
};
const cyclicEdges = new Set([...allCyclicEdges].filter(edgeCrossesContext));
const intraContextCount = allCyclicEdges.size - cyclicEdges.size;

if (UPDATE) {
  writeBaseline(cyclicEdges);
  console.log(
    `✓ 已写入基线 ${path.relative(ROOT, BASELINE_PATH)}：${cyclicEdges.size} 条跨上下文环上边` +
      `（另有 ${intraContextCount} 条上下文内部环上边放行）`,
  );
  process.exit(0);
}

const baseline = loadBaseline();

// 当前每条环上边都必须在基线内，否则视为「新增」
const violations = [...cyclicEdges].filter((e) => !baseline.has(e)).sort();
// 基线里已不再成环的边（债已还）——提示收紧，不算失败
const resolved = [...baseline].filter((e) => !cyclicEdges.has(e)).sort();

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        cyclicEdges: [...cyclicEdges].sort(),
        intraContextAllowed: intraContextCount,
        violations,
        resolvable: resolved,
      },
      null,
      2,
    ),
  );
  process.exit(violations.length ? 1 : 0);
}

const ctxTag = (name) => `${short(name)}[${ctxOf(name, graph.get(name)?.dir)}]`;

console.log(
  `循环依赖检查（上下文感知）：workspace 共 ${graph.size} 个本地包，` +
    `当前 ${cyclicEdges.size} 条跨上下文环上边（另放行 ${intraContextCount} 条上下文内部环上边），基线 ${baseline.size} 条。\n`,
);

if (violations.length) {
  console.error(
    `✗ 检测到 ${violations.length} 条基线之外的新增跨上下文环上边：\n`,
  );
  for (const e of violations) {
    const [u, v] = e.split(" -> ");
    const cycle = cycleThroughEdge(graph, u, v).map(short).join(" → ");
    console.error(`  • ${ctxTag(u)} → ${ctxTag(v)}`);
    console.error(`    形成环路: ${cycle}`);
  }
  console.error(
    "\n请拆除这条跨上下文依赖（下沉共享契约 / 走 event bus / 移到正确上下文，别跨界直接 import）。",
  );
  console.error(
    "若确属有意且已评审，运行 `node scripts/check-circular-deps.mjs --update-baseline` 更新基线。",
  );
  process.exit(1);
}

console.log("✓ 未发现基线之外的新增跨上下文环上边。");
if (resolved.length) {
  console.log(
    `\nℹ️ 有 ${resolved.length} 条基线边已不再跨上下文成环（债已还），建议运行 --update-baseline 收紧基线：`,
  );
  for (const e of resolved) {
    const [u, v] = e.split(" -> ");
    console.log(`  • ${short(u)} → ${short(v)}`);
  }
}
process.exit(0);
