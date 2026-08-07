/**
 * SSR 图标表与生成器。
 *
 * 生成物是构建期从同一批 lucide 组件渲出来的，所以这里守的是「有没有漏、会不会过期」
 * ——漏一个图标的表现是首屏少一块、水合后凭空长出来，肉眼很难当场看出是 bug。
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assembleSectionIcons } from "./section-icons/assemble.mjs";
import { SECTION_ICON_SVG } from "./section-icons.generated.js";
import { SECTION_ICON_CHOICES } from "./section-settings.js";

const GENERATED = "section-icons.generated.ts";

describe("SECTION_ICON_SVG", () => {
  it.each(SECTION_ICON_CHOICES)("%s 有图形", (name) => {
    expect(SECTION_ICON_SVG[name]).toMatch(/^</u);
  });

  it("只存内层：外层 <svg> 属性由渲染端写，尺寸描边才跟着 CSS 走", () => {
    for (const markup of Object.values(SECTION_ICON_SVG)) {
      expect(markup).not.toContain("<svg");
    }
  });

  it("表和白名单一一对应，没有多余项", () => {
    expect(Object.keys(SECTION_ICON_SVG).sort()).toEqual(
      [...SECTION_ICON_CHOICES].sort(),
    );
  });

  it("磁盘上的生成物是最新的——改了白名单或升级 lucide 后忘了重跑会红", () => {
    // 与 marketing-site-css 同一套「生成物必须是最新的」守法
    const onDisk = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), GENERATED),
      "utf8",
    );
    expect(onDisk).toBe(assembleSectionIcons());
  });
});
