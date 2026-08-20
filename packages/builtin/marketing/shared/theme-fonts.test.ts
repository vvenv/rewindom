import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assembleThemeFonts } from "./site-fonts/assemble.mjs";
import {
  THEME_FONT_ASSET_PATH,
  THEME_FONT_FAMILIES,
  THEME_FONT_GROUPS,
  THEME_FONT_STORAGE_PREFIX,
  themeFontCdnDir,
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
  it("分组覆盖目录且无重复", () => {
    const grouped = THEME_FONT_GROUPS.flatMap((group) => [...group.families]);
    expect(grouped).toEqual([...THEME_FONT_FAMILIES]);
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("每个 webfont 都有 @font-face，系统栈没有", () => {
    const webfonts = THEME_FONT_FAMILIES.filter(
      (family) =>
        family !== "system" && family !== "serif" && family !== "mono",
    );
    expect(webfonts.sort()).toEqual(Object.keys(THEME_FONT_FACE_CSS).sort());
    for (const family of webfonts) {
      expect(themeFontFaceCss([family])).toContain("@font-face");
      expect(themeFontFaceCss([family])).toContain(`${THEME_FONT_ASSET_PATH}/`);
    }
    expect(themeFontFaceCss(["system"])).toBe("");
  });

  it("系统栈零请求，中文走系统字体", () => {
    expect(themeFontCss("system")).toContain("PingFang SC");
    expect(themeFontCss("serif")).toContain("Songti SC");
    expect(themeFontCss("inter")).toContain("Inter Variable");
    expect(themeFontCss("fraunces")).toContain("Fraunces Variable");
    expect(themeFontCss("fira_code")).toContain("Fira Code Variable");
  });

  it("只在选中 webfont 时给出带引号的 @font-face 与同源路径", () => {
    const css = themeFontFaceCss(["inter"]);
    expect(css).toContain("font-family: 'Inter Variable'");
    expect(css).toContain("font-display: swap");
    expect(css).toContain(`${THEME_FONT_ASSET_PATH}/inter-latin-wght-normal-`);
    expect(css).not.toContain("fonts.googleapis.com");
    expect(themeFontFaceCssAll()).toContain("Source Serif 4 Variable");
  });

  it("可把 @font-face URL 改写到对象存储公开根", () => {
    const cdn = themeFontCdnDir("https://media.example.com/");
    expect(cdn).toBe(`https://media.example.com/${THEME_FONT_STORAGE_PREFIX}`);
    const css = themeFontFaceCss(["inter"], cdn);
    expect(css).toContain(
      `url("https://media.example.com/${THEME_FONT_STORAGE_PREFIX}/inter-latin-wght-normal-`,
    );
    expect(css).not.toContain(`${THEME_FONT_ASSET_PATH}/`);
    expect(themeFontCdnDir("")).toBeUndefined();
  });

  it("生成的 woff2 都落在客户端 public/assets/site-fonts", () => {
    expect(THEME_FONT_FILES.length).toBeGreaterThanOrEqual(
      Object.keys(THEME_FONT_FACE_CSS).length,
    );
    for (const file of THEME_FONT_FILES) {
      expect(existsSync(path.join(FONT_DIR, file)), file).toBe(true);
    }
  });

  it("生成物与 fontsource 切片一致（改了目录要跑 assemble:site-fonts）", () => {
    const { faces, files } = assembleThemeFonts();
    expect(files).toEqual([...THEME_FONT_FILES]);
    expect(faces).toEqual(THEME_FONT_FACE_CSS);
  });

  it("一组字族去重后再拼，同一款不会吐两遍 @font-face", () => {
    const once = themeFontFaceCss(["inter"]);
    const twice = themeFontFaceCss(["inter", "inter"]);
    expect(twice).toBe(once);
    const mixed = themeFontFaceCss(["inter", "newsreader", "system", null]);
    expect(mixed).toContain("Inter Variable");
    expect(mixed).toContain("Newsreader Variable");
    expect((mixed.match(/@font-face/g) ?? []).length).toBe(
      (once.match(/@font-face/g) ?? []).length +
        (themeFontFaceCss(["newsreader"]).match(/@font-face/g) ?? []).length,
    );
  });
});
