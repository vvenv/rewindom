import { describe, expect, it } from "vitest";

import { assembleModuleSiteCss } from "../../scripts/assemble-module-css.mjs";

import { BILLING_PLANS_CSS } from "./site-css.generated.js";

describe("billing site-css 生成物", () => {
  it("与 site-css/*.css 真源一致（改了 css 要跑 assemble:module-css）", () => {
    expect(assembleModuleSiteCss("billing")).toEqual({ BILLING_PLANS_CSS });
  });
});
