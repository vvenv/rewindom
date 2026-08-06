import { describe, expect, it } from "vitest";

import {
  composeSiteColor,
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
});
