/**
 * 生成 SSR 用的图标 SVG 表。
 *
 * SSR 不跑 React，但图标只有 React 组件形态（`lucide-react`）。**构建期**用
 * `react-dom/server` 把它们渲成静态 SVG 存下来——这样服务端拿到的和客户端画出来的
 * 是同一份图形，不是照着抄的第二份。
 *
 * 直接去 `lucide-react/dist/esm/icons/*.mjs` 挖 `__iconNode` 也能拿到数据，但那要处理
 * 别名文件（`line-chart.mjs` 只 re-export `chart-line.mjs` 的 default）与私有路径；
 * 渲染组件没有这些坑，而且升级 lucide 后重跑一次就自动跟上。
 *
 *   node marketing/shared/section-icons/assemble.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as icons from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS = path.join(HERE, "..", "section-settings.ts");
const OUT_PATH = path.join(HERE, "..", "section-icons.generated.ts");

/**
 * 白名单从 `section-settings.ts` 现读，不另存一份。
 *
 * 万一这里漏了一个，生成物的 `Record<SectionIconName, string>` 会在 tsc 那关报错
 * ——漂移是编译错误，不是运行时少一个图标。
 */
function readIconNames() {
  const source = readFileSync(SETTINGS, "utf8");
  const match = source.match(
    /export const SECTION_ICON_CHOICES = \[([\s\S]*?)\] as const;/u,
  );
  if (!match) throw new Error("SECTION_ICON_CHOICES not found");
  return [...match[1].matchAll(/"([A-Za-z0-9]+)"/gu)].map((m) => m[1]);
}

/** 只取 `<svg>` 的内层：外层属性由渲染端自己写（尺寸/描边跟着 CSS 走）。 */
function innerSvg(name) {
  const Icon = icons[name];
  if (!Icon) throw new Error(`lucide-react has no icon "${name}"`);
  const html = renderToStaticMarkup(createElement(Icon));
  const open = html.indexOf(">");
  const close = html.lastIndexOf("</svg>");
  if (open < 0 || close < 0) throw new Error(`unexpected svg for "${name}"`);
  return html.slice(open + 1, close);
}

export function assembleSectionIcons() {
  const names = readIconNames();
  const entries = names
    .map((name) => `  ${name}: ${JSON.stringify(innerSvg(name))},`)
    .join("\n");

  return `/**
 * GENERATED — do not edit.
 * Source: lucide-react components listed in \`SECTION_ICON_CHOICES\`.
 * Regenerate: \`pnpm --filter @be-water/modules assemble:section-icons\`
 */
import type { SectionIconName } from "./section-settings.js";

/** 图标的 \`<svg>\` 内层标记；外层属性由渲染端自己写。 */
export const SECTION_ICON_SVG: Record<SectionIconName, string> = {
${entries}
};
`;
}

export function writeSectionIconsGenerated() {
  const body = assembleSectionIcons();
  writeFileSync(OUT_PATH, body, "utf8");
  return { outPath: OUT_PATH, bytes: body.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = writeSectionIconsGenerated();
  console.log(
    `assembled section icons → ${path.relative(process.cwd(), result.outPath)} (${result.bytes} bytes)`,
  );
}
