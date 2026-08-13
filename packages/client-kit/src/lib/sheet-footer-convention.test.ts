/**
 * 全系统 sheet 底部的对齐守卫。
 *
 * 二十多张 sheet 分散在八个模块里，各写各的 footer 时会慢慢分叉：按钮顺序反过来、
 * 宽度靠各自补 `flex-row`、pending 时有的转圈有的没有。这些单看都是小事，摞在一起
 * 就是「每张抽屉都有点不一样」——而这正是 review 时最容易放过去的那一类。
 *
 * 约定（`SheetFooter` 默认全宽堆叠，只在 `@xl/sheet-content` 起转成右对齐一行）：
 *
 * 1. **取消在前、主按钮在后**。`flex-col-reverse` 让堆叠时主按钮在上（拇指够得着）、
 *    成行时在最右（视线终点）。写反了两种形态同时错。
 * 2. **不自己补 `flex-row` / `justify-end`**，也**不用视口断点**（`sm:` / `md:`）改
 *    footer 的布局。按钮该全宽还是成行取决于**这张面板有多宽**，不取决于视口——
 *    同一个视口下 384px 的抽屉与 768px 的编辑器该长得不一样。要横排就用容器查询
 *    前缀 `@xl/sheet-content:`。
 *
 * 破坏性动作（删除）与次要动作（恢复默认）靠左是允许的例外，用
 * `@xl/sheet-content:justify-between` 表达——它们本来就不该和主按钮挤在一起。
 *
 * 放在 client-kit：`SheetFooter` 是 `@rewindom/ui` 的组件，而这条约束跨所有模块，
 * 挂在任何一个业务模块下都名不副实。零依赖遍历，同 `verify-module.mjs` 的做法。
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");

const SCAN_ROOTS = ["packages", "apps"];
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", "coverage"]);
/** 组件自身的定义不参与扫描——那里的 class 就是基类。 */
const SKIP_FILES = new Set([path.join("packages", "ui", "src", "sheet.tsx")]);

function walk(dir: string, into: string[]): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, into);
    else if (entry.name.endsWith(".tsx")) into.push(full);
  }
  return into;
}

interface Footer {
  file: string;
  className: string;
  body: string;
}

function collectFooters(): Footer[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) walk(path.join(REPO_ROOT, root), files);

  const out: Footer[] = [];
  for (const file of files) {
    const relative = path.relative(REPO_ROOT, file);
    if (SKIP_FILES.has(relative)) continue;
    const source = readFileSync(file, "utf8");
    if (!source.includes("<SheetFooter")) continue;
    for (const match of source.matchAll(
      /<SheetFooter([^>]*)>([\s\S]*?)<\/SheetFooter>/gu,
    )) {
      out.push({
        file: relative,
        className: /className="([^"]*)"/u.exec(match[1] ?? "")?.[1] ?? "",
        body: match[2] ?? "",
      });
    }
  }
  return out;
}

/** footer 里各个 `<Button>` 的 variant，按出现顺序；没写 variant 的即主按钮。 */
function buttonVariants(body: string): string[] {
  return [...body.matchAll(/<Button\b([\s\S]*?)>/gu)].map(([, attrs = ""]) => {
    return /variant="(\w+)"/u.exec(attrs)?.[1] ?? "primary";
  });
}

const FOOTERS = collectFooters();

describe("sheet footer 全系统对齐", () => {
  // glob 写错时这条先红，免得下面两条在空集合上静默通过
  it("扫到了全部 sheet footer", () => {
    expect(FOOTERS.length).toBeGreaterThan(20);
  });

  /*
   * 只约束「取消 + 主按钮」这一类表单脚。单按钮（只有删除、只有关闭）不在此列
   * ——它们没有顺序可言。
   */
  it("取消（outline）永远排在主按钮之前", () => {
    const wrong = FOOTERS.filter(({ body }) => {
      const variants = buttonVariants(body);
      const outline = variants.indexOf("outline");
      const primary = variants.indexOf("primary");
      return outline !== -1 && primary !== -1 && outline > primary;
    }).map(({ file }) => file);

    expect(wrong).toEqual([]);
  });

  it("不自己补 flex-row / justify-end：宽度与对齐归基类", () => {
    const overrides = FOOTERS.filter(
      ({ className }) =>
        /(?:^|\s)flex-row(?:\s|$)/u.test(className) ||
        /(?:^|\s)justify-end(?:\s|$)/u.test(className),
    )
      .map(({ file, className }) => `${file}: ${className}`)
      // 侧栏那张 footer 装的是用户菜单而不是按钮，横排是它本来的形态
      .filter((entry) => !entry.includes("Sidebar.tsx"));

    expect(overrides).toEqual([]);
  });

  /*
   * 按钮全宽还是成行，取决于**这张面板有多宽**——视口断点表达不了这件事：同一个
   * 1440px 视口下，384px 的抽屉与 768px 的编辑器该长得不一样。
   */
  it("footer 的布局类用容器查询前缀，不用视口断点", () => {
    const viewportBreakpoints = FOOTERS.filter(({ className }) =>
      /(?:^|\s)(?:sm|md|lg|xl):(?:flex-|justify-|items-|grid)/u.test(className),
    ).map(({ file, className }) => `${file}: ${className}`);

    expect(viewportBreakpoints).toEqual([]);
  });
});
