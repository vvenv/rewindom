import { describe, expect, it } from "vitest";

import { assembleModuleSiteCss } from "../../../packages/builtin/scripts/assemble-module-css.mjs";

import { SHOP_STOREFRONT_CSS } from "./site-css.generated.js";

describe("shop site-css 生成物", () => {
  it("与 site-css/*.css 真源一致（改了 css 要跑 assemble:module-css）", () => {
    expect(assembleModuleSiteCss("shop")).toEqual({ SHOP_STOREFRONT_CSS });
  });

  it("设计注释在构建期剥掉，不发给访客", () => {
    expect(SHOP_STOREFRONT_CSS).toContain(".shop-product{");
    expect(SHOP_STOREFRONT_CSS).not.toContain("/*");
    expect(SHOP_STOREFRONT_CSS).not.toContain("@import");
  });
});
