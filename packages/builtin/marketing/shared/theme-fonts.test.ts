import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assembleThemeFonts } from "./site-fonts/assemble.mjs";
import {
  THEME_FONT_FAMILIES,
  themeFontCss,
  themeFontFaceCss,
  themeFontFaceCssAll,
} from "./theme-fonts.js";
import {
  THEME_FONT_FACE_CSS,
  THEME_FONT_FILES,
} from "./theme-fonts.generated.js";

const SHARED_ROOT = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(
  SHARED_ROOT,
  "../../../../apps/client/public/assets/site-fonts",
);

describe("theme fonts", () => {
  it("目录含系统栈与自托管 webfont", () => {
    expect(THEME_FONT_FAMILIES).toEqual([
      "system",
      "serif",
      "mono",
      "inter",
      "source_serif",
      "newsreader",
      "jetbrains_mono",
    ]);
  });

  it("系统栈零请求，中文走系统字体", () => {
    expect(themeFontCss("system")).toContain("PingFang SC");
    expect(themeFontCss("serif")).toContain("Songti SC");
    expect(themeFontFaceCss("system")).toBe("");
    expect(themeFontFaceCss("serif")).toBe("");
    expect(themeFontFaceCss("mono")).toBe("");
  });

  it("webfont 栈带 variable family，中文仍回落系统", () => {
    expect(themeFontCss("inter")).toContain("Inter Variable");
    expect(themeFontCss("inter")).toContain("PingFang SC");
    expect(themeFontCss("source_serif")).toContain("Source Serif 4 Variable");
    expect(themeFontCss("newsreader")).toContain("Newsreader Variable");
    expect(themeFontCss("jetbrains_mono")).toContain("JetBrains Mono Variable");
  });

  it("只在选中 webfont 时给出带引号的 @font-face 与 /assets/site-fonts URL", () => {
    const css = themeFontFaceCss("inter");
    expect(css).toContain("@font-face");
    expect(css).toContain("font-family: 'Inter Variable'");
    expect(css).toContain("font-display: swap");
    expect(css).toContain("/assets/site-fonts/inter-latin-wght-normal-");
    expect(css).not.toContain("fonts.googleapis.com");
    expect(themeFontFaceCssAll()).toContain("Source Serif 4 Variable");
  });

  it("生成的 woff2 都落在客户端 public/assets/site-fonts", () => {
    expect(THEME_FONT_FILES.length).toBe(8);
    for (const file of THEME_FONT_FILES) {
      expect(existsSync(path.join(FONT_DIR, file)), file).toBe(true);
    }
  });

  it("生成物与 fontsource 切片一致（改了目录要跑 assemble:site-fonts）", () => {
    const { faces, files } = assembleThemeFonts();
    expect(files).toEqual([...THEME_FONT_FILES]);
    expect(faces).toEqual(THEME_FONT_FACE_CSS);
  });
});
