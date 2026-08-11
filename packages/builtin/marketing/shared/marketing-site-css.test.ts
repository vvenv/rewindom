import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assembleMarketingSiteCss,
  listMarketingSiteCssSources,
  listSectionCssTypes,
  writeMarketingSiteCssGenerated,
} from "./site-css/assemble.mjs";
import {
  MARKETING_SECTION_CSS,
  MARKETING_SITE_CSS,
  MARKETING_SITE_CSS_BASE,
} from "./marketing-site-css.js";
import {
  loadMarketingSiteCss,
  loadMarketingSiteCssFor,
} from "./load-marketing-site-css.js";
import { BUILTIN_SECTION_DEFINITIONS } from "./sections/index.js";
import type { SectionType } from "./sections/types.js";

const SHARED_ROOT = path.dirname(fileURLToPath(import.meta.url));

describe("marketing-site-css", () => {
  it("常驻部分带着 base 与段共用原子", () => {
    expect(MARKETING_SITE_CSS_BASE).toContain(".btn{");
    expect(MARKETING_SITE_CSS_BASE).toContain(".sec-band");
    expect(MARKETING_SITE_CSS_BASE).toContain(".marketing-site-root");
    expect(MARKETING_SITE_CSS_BASE).toContain(".site-stack");
    expect(MARKETING_SITE_CSS_BASE).toContain(".site-main");
    // `_common` 的原子被四五个段共用，必须常驻
    expect(MARKETING_SITE_CSS_BASE).toContain(".card{");
    expect(MARKETING_SITE_CSS_BASE).toContain(".grid{");
    // 页头页脚都用 .brand/.logo，所以它们归共用而不是归 header
    expect(MARKETING_SITE_CSS_BASE).toContain(".brand{");
    expect(MARKETING_SITE_CSS_BASE).not.toContain("@import");
  });

  it("段样式按 type 分开，各在各的条目里", () => {
    expect(MARKETING_SECTION_CSS.hero).toContain(".hero");
    expect(MARKETING_SECTION_CSS.band).toContain(".band");
    expect(MARKETING_SECTION_CSS.form).toContain(".form-grid");
    // 别的段的类不该混进来
    expect(MARKETING_SECTION_CSS.hero).not.toContain(".form-grid");
    expect(MARKETING_SECTION_CSS.band).not.toContain(".hero");
  });

  it("全量表 = 常驻 + 所有段", () => {
    expect(MARKETING_SITE_CSS).toContain(".btn{");
    expect(MARKETING_SITE_CSS).toContain(".hero");
    expect(MARKETING_SITE_CSS).toContain(".band");
    expect(loadMarketingSiteCss()).toBe(MARKETING_SITE_CSS);
  });

  it("按需只发用到的段——没上页的段不该出现", () => {
    const css = loadMarketingSiteCssFor(new Set(["hero", "band"]));
    expect(css).toContain(".btn{"); // 常驻照发
    expect(css).toContain(".hero");
    expect(css).toContain(".band");
    expect(css).not.toContain(".form-grid");
    expect(css.length).toBeLessThan(MARKETING_SITE_CSS.length);
  });

  it("按需的顺序由注册顺序定，与传入顺序无关", () => {
    const a = loadMarketingSiteCssFor(new Set(["band", "hero"]));
    const b = loadMarketingSiteCssFor(new Set(["hero", "band"]));
    // 顺序若随页面上段的排列走，同特异性规则的胜负就会随租户拖拽而变
    expect(a).toBe(b);
  });

  it("认不出的 type 直接跳过，不炸", () => {
    expect(() =>
      loadMarketingSiteCssFor(new Set(["hero", "definitely-not-a-section"])),
    ).not.toThrow();
  });

  it("生成物与共置的 css 源文件一致", () => {
    const { base, sections } = assembleMarketingSiteCss();
    expect(MARKETING_SITE_CSS_BASE).toBe(base);
    expect(MARKETING_SECTION_CSS).toEqual(sections);
    // 同时确认盘上的生成文件没有漂移（未提交的改动会在这里露出来）
    writeMarketingSiteCssGenerated();
    const regenerated = readFileSync(
      path.join(SHARED_ROOT, "marketing-site-css.generated.ts"),
      "utf8",
    );
    expect(regenerated).toContain("export const MARKETING_SITE_CSS_BASE");
    expect(regenerated).toContain("export const MARKETING_SECTION_CSS");
  });

  it("每个注册了的段都有共置的 styles.css", () => {
    const discovered = new Set(listSectionCssTypes());
    const registered = Object.keys(BUILTIN_SECTION_DEFINITIONS) as SectionType[];
    for (const type of registered) {
      const rel = `sections/${type}/styles.css`;
      expect(existsSync(path.join(SHARED_ROOT, rel)), `missing ${rel}`).toBe(
        true,
      );
      // 扫目录发现，不需要手工清单——但漏了文件仍要报出来
      expect(discovered.has(type), `未扫到 ${rel}`).toBe(true);
    }
    const sources = listMarketingSiteCssSources();
    expect(sources).toContain("site-css/base.css");
    expect(sources).toContain("site-css/member.css");
    expect(sources).toContain("sections/_common/styles.css");
  });
});
