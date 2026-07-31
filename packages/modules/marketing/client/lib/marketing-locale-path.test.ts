import { describe, expect, it } from "vitest";

import {
  isMarketingContentPath,
  isMarketingLocalizableHref,
  marketingPathsMatch,
  parseMarketingLocalePath,
  swapMarketingLocale,
  withMarketingLocale,
} from "./marketing-locale-path.js";

describe("parseMarketingLocalePath", () => {
  it("treats unprefixed paths as default locale", () => {
    expect(parseMarketingLocalePath("/pricing")).toEqual({
      locale: "zh-CN",
      path: "/pricing",
      prefixed: false,
    });
  });

  it("strips locale prefixes", () => {
    expect(parseMarketingLocalePath("/en/docs/quickstart")).toEqual({
      locale: "en",
      path: "/docs/quickstart",
      prefixed: true,
    });
    expect(parseMarketingLocalePath("/zh-CN")).toEqual({
      locale: "zh-CN",
      path: "/",
      prefixed: true,
    });
  });
});

describe("withMarketingLocale / swapMarketingLocale", () => {
  it("keeps default locale unprefixed unless forced", () => {
    expect(withMarketingLocale("/pricing", "zh-CN")).toBe("/pricing");
    expect(
      withMarketingLocale("/pricing", "zh-CN", { forcePrefix: true }),
    ).toBe("/zh-CN/pricing");
    expect(withMarketingLocale("/", "en")).toBe("/en");
  });

  it("swaps locale while preserving logical path", () => {
    expect(swapMarketingLocale("/en/pricing", "zh-CN")).toBe("/zh-CN/pricing");
    expect(swapMarketingLocale("/pricing", "en")).toBe("/en/pricing");
  });
});

describe("path helpers", () => {
  it("recognises marketing content and localizable hrefs", () => {
    expect(isMarketingContentPath("/en/docs")).toBe(true);
    expect(isMarketingContentPath("/login")).toBe(false);
    expect(isMarketingLocalizableHref("/docs/quickstart")).toBe(true);
    expect(isMarketingLocalizableHref("/register")).toBe(false);
  });

  it("matches nav active state on logical paths", () => {
    expect(marketingPathsMatch("/en/docs/quickstart", "/docs")).toBe(true);
    expect(marketingPathsMatch("/pricing", "/docs")).toBe(false);
  });
});
