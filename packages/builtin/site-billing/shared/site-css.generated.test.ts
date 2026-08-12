import { describe, expect, it } from "vitest";

import { assembleModuleSiteCss } from "../../scripts/assemble-module-css.mjs";

import { SITE_BILLING_CSS } from "./site-css.generated.js";

describe("site-billing site-css 生成物", () => {
  it("与 site-css/*.css 真源一致（改了 css 要跑 assemble:module-css）", () => {
    expect(assembleModuleSiteCss("site-billing")).toEqual({ SITE_BILLING_CSS });
  });

  it("与 billing.plans 段用不同的 class 前缀，互不越界", () => {
    expect(SITE_BILLING_CSS).toContain(".mplan-card");
    expect(SITE_BILLING_CSS).not.toContain(".plan-card{");
  });
});
