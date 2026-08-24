import { describe, expect, it } from "vitest";

import {
  accentForCanvases,
  composeSiteColor,
  contrastRatio,
  expandHex,
  isSiteColor,
  normalizeSiteColor,
  primaryForegroundFor,
  splitSiteColor,
} from "./site-color.js";

describe("site-color", () => {
  it("accepts 3/4/6/8 digit hex when alpha is allowed", () => {
    expect(isSiteColor("#abc")).toBe(true);
    expect(isSiteColor("#abcd")).toBe(true);
    expect(isSiteColor("#aabbcc")).toBe(true);
    expect(isSiteColor("#aabbcc80")).toBe(true);
    expect(isSiteColor("#aabbcc80", false)).toBe(false);
    expect(isSiteColor("red")).toBe(false);
  });

  it("normalizes empty and invalid to null", () => {
    expect(normalizeSiteColor("")).toBeNull();
    expect(normalizeSiteColor("  ")).toBeNull();
    expect(normalizeSiteColor("#0f766e80")).toBe("#0f766e80");
    expect(normalizeSiteColor("not-a-color")).toBeNull();
  });

  it("splits and composes alpha", () => {
    expect(splitSiteColor("#0f766e80")).toEqual({
      rgb: "#0f766e",
      alphaPercent: 50,
    });
    expect(composeSiteColor("#0f766e", 50)).toBe("#0f766e80");
    expect(composeSiteColor("#0f766e", 100)).toBe("#0f766e");
    expect(expandHex("#abc")).toBe("#aabbcc");
    expect(expandHex("#abcd")).toBe("#aabbccdd");
  });

  it("picks a readable foreground for primary buttons", () => {
    expect(primaryForegroundFor("#0369a1")).toBe("#ffffff");
    expect(primaryForegroundFor("#facc15")).toBe("#0a0a0a");
    expect(primaryForegroundFor("#abc")).toBe("#0a0a0a");
  });

  it("亮色画布上够对比度的品牌色原样返回", () => {
    // #4F46E5 在白底上 6.29:1，不该被动
    expect(accentForCanvases("#4F46E5", ["#ffffff", "#fafafa"], 4.5)).toBe(
      "#4F46E5",
    );
  });

  it("暗色画布上把品牌色提亮到够读，且按最差的那块底算", () => {
    const tuned = accentForCanvases("#4F46E5", ["#0a0a0a", "#18181b"], 4.5);
    expect(tuned).not.toBe("#4F46E5");
    // 卡片 surface 比页面底更亮 = 更难读，它必须也过线
    expect(contrastRatio(tuned, "#18181b")!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tuned, "#0a0a0a")!).toBeGreaterThanOrEqual(4.5);
    // 提亮不是换色：仍然是那支靛蓝（蓝通道最高、红绿相近）
    const [r, g, b] = [1, 3, 5].map((i) =>
      Number.parseInt(tuned.slice(i, i + 2), 16),
    );
    expect(b).toBeGreaterThan(r);
    expect(Math.abs(r - g)).toBeLessThan(24);
  });

  it("非法输入不炸，原样退回", () => {
    expect(accentForCanvases("nope", ["#ffffff"], 4.5)).toBe("nope");
    expect(accentForCanvases("#4F46E5", [], 4.5)).toBe("#4F46E5");
    expect(contrastRatio("#fff", "nope")).toBeNull();
  });
});
