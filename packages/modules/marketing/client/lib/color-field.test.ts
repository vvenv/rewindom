import { describe, expect, it } from "vitest";

import { resolveColorFieldParts } from "./color-field.js";

describe("resolveColorFieldParts", () => {
  it("splits an 8-digit value into an opaque swatch plus alpha", () => {
    expect(resolveColorFieldParts("#3366cc80")).toEqual({
      valid: true,
      swatch: "#3366cc",
      alphaPercent: 50,
      preview: "#3366cc80",
    });
  });

  it("treats a 6-digit value as fully opaque", () => {
    const parts = resolveColorFieldParts("#3366cc");

    expect(parts.alphaPercent).toBe(100);
    expect(parts.preview).toBe("#3366cc");
  });

  it("expands shorthand hex for both the swatch and the preview", () => {
    expect(resolveColorFieldParts("#36c")).toMatchObject({
      swatch: "#3366cc",
      preview: "#3366cc",
    });
  });

  it("keeps the swatch on the fallback while the user is mid-typing", () => {
    // 输入框允许非法中间态；取色器不能跟着闪
    expect(resolveColorFieldParts("#33", { fallback: "#ffffff" })).toEqual({
      valid: false,
      swatch: "#ffffff",
      alphaPercent: 100,
      preview: null,
    });
  });

  it("reports an empty value as unset rather than black", () => {
    const parts = resolveColorFieldParts("", { fallback: "#ffffff" });

    expect(parts.valid).toBe(false);
    expect(parts.preview).toBeNull();
  });

  it("rejects alpha when the field does not allow it", () => {
    expect(
      resolveColorFieldParts("#3366cc80", { allowAlpha: false }).valid,
    ).toBe(false);
  });
});
