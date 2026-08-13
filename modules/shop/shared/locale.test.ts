import { describe, expect, it } from "vitest";

import { resolveShopLocaleText, toShopLocalizedMap } from "./locale.js";

describe("resolveShopLocaleText", () => {
  it("prefers the active locale then zh-CN", () => {
    expect(
      resolveShopLocaleText({ "zh-CN": "杯", en: "Mug" }, "en"),
    ).toBe("Mug");
    expect(resolveShopLocaleText({ "zh-CN": "杯" }, "en")).toBe("杯");
    expect(resolveShopLocaleText("plain", "zh-CN")).toBe("plain");
  });
});

describe("toShopLocalizedMap", () => {
  it("wraps a plain string in the active locale", () => {
    expect(toShopLocalizedMap("Mug", "en")).toEqual({ en: "Mug" });
  });
});
