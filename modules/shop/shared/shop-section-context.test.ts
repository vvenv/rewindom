import { describe, expect, it } from "vitest";

import {
  isSiteLocalizableHref,
  localizeSiteHref,
} from "@rewindom/builtin/marketing/shared/site-locale.js";

import {
  emptyShopContext,
  isShopLocaleSwitchablePath,
  shopContextEntry,
  shopInterpolationValues,
  shopStorefrontAlternates,
} from "./shop-section-context.js";

describe("isShopLocaleSwitchablePath", () => {
  it("allows the catalog and a product detail", () => {
    expect(isShopLocaleSwitchablePath("/shop")).toBe(true);
    expect(isShopLocaleSwitchablePath("/shop/mug")).toBe(true);
  });

  it("rejects cart, checkout, orders and collections", () => {
    expect(isShopLocaleSwitchablePath("/shop/cart")).toBe(false);
    expect(isShopLocaleSwitchablePath("/shop/checkout")).toBe(false);
    expect(isShopLocaleSwitchablePath("/shop/orders/1001")).toBe(false);
    expect(isShopLocaleSwitchablePath("/shop/collections/mugs")).toBe(false);
  });

  it("rejects unrelated paths", () => {
    expect(isShopLocaleSwitchablePath("/")).toBe(false);
    expect(isShopLocaleSwitchablePath("/docs")).toBe(false);
  });
});

describe("shop locale hrefs", () => {
  it("registers product detail paths as localizable", () => {
    expect(isSiteLocalizableHref("/shop/mug")).toBe(true);
    expect(isSiteLocalizableHref("/shop/cart")).toBe(false);
    expect(localizeSiteHref("/shop/mug", "en", "zh-CN")).toBe("/en/shop/mug");
    expect(localizeSiteHref("/shop", "en", "zh-CN")).toBe("/en/shop");
  });
});

describe("shopStorefrontAlternates", () => {
  it("builds prefixed URLs for every site locale on the catalog", () => {
    expect(
      shopStorefrontAlternates({
        path: "/shop",
        locales: ["zh-CN", "en"],
        defaultLocale: "zh-CN",
        current: "zh-CN",
      }),
    ).toEqual([
      { locale: "zh-CN", path: "/shop" },
      { locale: "en", path: "/en/shop" },
    ]);
  });

  it("still lists the current locale when the site snapshot omitted it", () => {
    expect(
      shopStorefrontAlternates({
        path: "/shop/mug",
        locales: ["zh-CN"],
        defaultLocale: "zh-CN",
        current: "en",
      }).map((entry) => entry.path),
    ).toEqual(["/shop/mug", "/en/shop/mug"]);
  });

  it("hides the switcher on cart and collection paths", () => {
    expect(
      shopStorefrontAlternates({
        path: "/shop/cart",
        locales: ["zh-CN", "en"],
        defaultLocale: "zh-CN",
        current: "zh-CN",
      }),
    ).toEqual([]);
    expect(
      shopStorefrontAlternates({
        path: "/shop/collections/mugs",
        locales: ["zh-CN", "en"],
        defaultLocale: "zh-CN",
        current: "zh-CN",
      }),
    ).toEqual([]);
  });

  it("hides the switcher on noindex pages", () => {
    expect(
      shopStorefrontAlternates({
        path: "/shop",
        locales: ["zh-CN", "en"],
        defaultLocale: "zh-CN",
        current: "zh-CN",
        noindex: true,
      }),
    ).toEqual([]);
  });
});

describe("shopInterpolationValues", () => {
  it("商品页把 seo_title 填进 {product}", () => {
    const values = shopInterpolationValues(
      emptyShopContext({
        product: {
          title: "Mug",
          subtitle: "Ceramic",
          description: "A mug",
          seo_title: "Best mug 2026",
          seo_description: "Buy the mug",
          images: [],
          variants: [],
        },
      }),
    );
    expect(values.product).toBe("Best mug 2026");
    expect(values.product_description).toBe("Buy the mug");
    expect(shopContextEntry(emptyShopContext()).interpolation).toEqual(
      shopInterpolationValues(emptyShopContext()),
    );
  });
});
