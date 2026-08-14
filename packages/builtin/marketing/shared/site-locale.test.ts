import { afterEach, describe, expect, it } from "vitest";

import {
  isSiteLocalizableHref,
  localizeSiteHref,
  isMarketingPublicPath,
  parseSiteLocalePath,
  registerLocalizableAppHref,
  resetLocalizableAppHrefs,
  resolveLocaleSegment,
  siteHref,
  siteLocaleOrder,
  withSiteLocale,
} from "./site-locale.js";

afterEach(() => {
  resetLocalizableAppHrefs();
});

describe("resolveLocaleSegment", () => {
  it("accepts the canonical slug and its lowercase form", () => {
    expect(resolveLocaleSegment("zh-CN")).toBe("zh-CN");
    expect(resolveLocaleSegment("zh-cn")).toBe("zh-CN");
    expect(resolveLocaleSegment("en")).toBe("en");
  });

  it("rejects anything that is not a supported locale", () => {
    expect(resolveLocaleSegment("about")).toBeNull();
    expect(resolveLocaleSegment("fr")).toBeNull();
    expect(resolveLocaleSegment("")).toBeNull();
  });
});

describe("parseSiteLocalePath", () => {
  it("splits an explicit locale prefix off the logical path", () => {
    expect(parseSiteLocalePath("/en/about", "zh-CN")).toEqual({
      locale: "en",
      path: "/about",
      prefixed: true,
    });
  });

  it("treats a bare locale segment as that language's home", () => {
    expect(parseSiteLocalePath("/en", "zh-CN")).toEqual({
      locale: "en",
      path: "/",
      prefixed: true,
    });
  });

  it("falls back to the site default when there is no prefix", () => {
    expect(parseSiteLocalePath("/about", "en")).toEqual({
      locale: "en",
      path: "/about",
      prefixed: false,
    });
  });

  it("keeps nested doc paths intact", () => {
    expect(parseSiteLocalePath("/en/docs/quickstart", "zh-CN")).toEqual({
      locale: "en",
      path: "/docs/quickstart",
      prefixed: true,
    });
  });

  it("normalises trailing slashes", () => {
    expect(parseSiteLocalePath("/en/about/", "zh-CN").path).toBe("/about");
    expect(parseSiteLocalePath("/", "zh-CN").path).toBe("/");
  });
});

describe("withSiteLocale", () => {
  it("leaves the site default language unprefixed", () => {
    expect(withSiteLocale("/about", "zh-CN", "zh-CN")).toBe("/about");
    expect(withSiteLocale("/", "zh-CN", "zh-CN")).toBe("/");
  });

  it("prefixes every other language", () => {
    expect(withSiteLocale("/about", "en", "zh-CN")).toBe("/en/about");
    expect(withSiteLocale("/", "en", "zh-CN")).toBe("/en");
  });

  it("follows the site default rather than the platform default", () => {
    // 站点主语言是 en 时，无前缀的那一支就是 en
    expect(withSiteLocale("/about", "en", "en")).toBe("/about");
    expect(withSiteLocale("/about", "zh-CN", "en")).toBe("/zh-CN/about");
  });
});

describe("isMarketingPublicPath", () => {
  it("treats tenant CMS paths as public marketing", () => {
    expect(isMarketingPublicPath("/")).toBe(true);
    expect(isMarketingPublicPath("/pricing")).toBe(true);
    expect(isMarketingPublicPath("/en/pricing")).toBe(true);
  });

  it("excludes the app area and auth routes", () => {
    expect(isMarketingPublicPath("/app/site")).toBe(false);
    expect(isMarketingPublicPath("/login")).toBe(false);
    expect(isMarketingPublicPath("/auth/oauth/callback")).toBe(false);
    expect(isMarketingPublicPath("/member/login")).toBe(false);
  });
});

describe("isSiteLocalizableHref", () => {
  it("accepts tenant content paths", () => {
    expect(isSiteLocalizableHref("/")).toBe(true);
    expect(isSiteLocalizableHref("/about")).toBe(true);
    expect(isSiteLocalizableHref("/docs/quickstart")).toBe(true);
  });

  it("skips the app area, the API and external links", () => {
    expect(isSiteLocalizableHref("/login")).toBe(false);
    expect(isSiteLocalizableHref("/app/notes")).toBe(false);
    expect(isSiteLocalizableHref("/api/public/site")).toBe(false);
    expect(isSiteLocalizableHref("https://example.com")).toBe(false);
    expect(isSiteLocalizableHref("//example.com")).toBe(false);
    expect(isSiteLocalizableHref("mailto:a@b.c")).toBe(false);
  });

  it("skips paths that already carry a locale prefix", () => {
    expect(isSiteLocalizableHref("/en/about")).toBe(false);
  });

  it("keeps storefront and member SSR entries localizable", () => {
    expect(isSiteLocalizableHref("/shop")).toBe(true);
    expect(isSiteLocalizableHref("/member/login")).toBe(true);
    expect(isSiteLocalizableHref("/shop/cart")).toBe(false);
    expect(isSiteLocalizableHref("/shop/mug")).toBe(false);
    expect(isSiteLocalizableHref("/member/oauth/callback")).toBe(false);
  });

  it("lets modules register extra app-prefix paths that take a locale", () => {
    registerLocalizableAppHref((path) => path === "/shop/mug");
    expect(isSiteLocalizableHref("/shop/mug")).toBe(true);
    expect(isSiteLocalizableHref("/shop/cart")).toBe(false);
    expect(localizeSiteHref("/shop/mug", "en", "zh-CN")).toBe("/en/shop/mug");
  });
});

describe("localizeSiteHref", () => {
  it("rewrites internal links and keeps query / hash", () => {
    expect(localizeSiteHref("/about?a=1#top", "en", "zh-CN")).toBe(
      "/en/about?a=1#top",
    );
  });

  it("leaves the app area alone", () => {
    expect(localizeSiteHref("/login", "en", "zh-CN")).toBe("/login");
  });

  it("prefixes the shop catalog so header nav stays on the current locale", () => {
    expect(localizeSiteHref("/shop", "en", "zh-CN")).toBe("/en/shop");
    expect(localizeSiteHref("/shop", "zh-CN", "zh-CN")).toBe("/shop");
    expect(localizeSiteHref("/about", "en", "zh-CN")).toBe("/en/about");
    expect(localizeSiteHref("/member/login", "en", "zh-CN")).toBe(
      "/en/member/login",
    );
    expect(localizeSiteHref("/shop/cart", "en", "zh-CN")).toBe("/shop/cart");
  });

  it("is idempotent", () => {
    // 服务端已在 localizeSection 里改写过一次，客户端 SiteLink 会再过一遍
    const once = localizeSiteHref("/about", "en", "zh-CN");
    expect(localizeSiteHref(once, "en", "zh-CN")).toBe(once);
  });
});

describe("siteHref", () => {
  it("leaves the href alone when the render context has no locale", () => {
    expect(siteHref("/about", {})).toBe("/about");
  });

  it("prefixes through the same gate as localizeSiteHref", () => {
    expect(siteHref("/about", { locale: "en", defaultLocale: "zh-CN" })).toBe(
      "/en/about",
    );
    expect(siteHref("/login", { locale: "en", defaultLocale: "zh-CN" })).toBe(
      "/login",
    );
  });
});

describe("siteLocaleOrder", () => {
  it("puts the site default language first", () => {
    expect(siteLocaleOrder("en")[0]).toBe("en");
    expect(siteLocaleOrder("zh-CN")[0]).toBe("zh-CN");
    expect(siteLocaleOrder("en")).toHaveLength(2);
  });
});
