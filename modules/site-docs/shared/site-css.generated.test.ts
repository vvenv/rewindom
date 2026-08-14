import { describe, expect, it } from "vitest";

import {
  assembleModuleSiteCss,
  listHandwrittenModuleCssTs,
} from "../../../packages/builtin/scripts/assemble-module-css.mjs";

import {
  ARTICLE_CSS,
  LIST_CSS,
  NAV_CSS,
  SEARCH_CSS,
  TOC_CSS,
} from "./site-css.generated.js";

describe("site-docs site-css 生成物", () => {
  it("与 site-css/*.css 真源一致（改了 css 要跑 assemble:module-css）", () => {
    expect(assembleModuleSiteCss("site-docs")).toEqual({
      ARTICLE_CSS,
      LIST_CSS,
      NAV_CSS,
      SEARCH_CSS,
      TOC_CSS,
    });
  });

  it("设计注释在构建期剥掉，不发给访客", () => {
    for (const css of [ARTICLE_CSS, LIST_CSS, NAV_CSS, SEARCH_CSS, TOC_CSS]) {
      expect(css).not.toContain("/*");
      expect(css).not.toContain("@import");
    }
  });

  it("没有手写 shared/*-css.ts（真源只许 site-css/*.css）", () => {
    expect(listHandwrittenModuleCssTs()).toEqual([]);
  });
});
