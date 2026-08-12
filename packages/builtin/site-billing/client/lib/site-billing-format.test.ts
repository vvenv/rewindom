import { describe, expect, it } from "vitest";

import { memberPlanDisplayName } from "./site-billing-format.js";

describe("memberPlanDisplayName", () => {
  it("用当前语言的名字", () => {
    expect(
      memberPlanDisplayName(
        { name: { __i18n: { "zh-CN": "高级会员", en: "Pro" } }, slug: "pro" },
        "zh-CN",
      ),
    ).toBe("高级会员");
  });

  it("当前语言没填时退到任意填过的语言", () => {
    expect(
      memberPlanDisplayName(
        { name: { __i18n: { en: "Pro" } }, slug: "pro" },
        "zh-CN",
      ),
    ).toBe("Pro");
  });

  it("一种语言都没填时退到 slug", () => {
    expect(
      memberPlanDisplayName({ name: { __i18n: {} }, slug: "pro" }, "zh-CN"),
    ).toBe("pro");
  });

  it("空串不算填过", () => {
    expect(
      memberPlanDisplayName(
        { name: { __i18n: { "zh-CN": "", en: "Pro" } }, slug: "pro" },
        "zh-CN",
      ),
    ).toBe("Pro");
  });
});
