import { describe, expect, it } from "vitest";

import {
  buildDefaultProductSite,
  isGenericStarterSiteName,
  PRODUCT_SITE_LOCALES,
} from "./default-product-site-content.js";

describe("buildDefaultProductSite", () => {
  it("builds bilingual home + pricing with product copy", () => {
    const payload = buildDefaultProductSite();

    expect(payload.site.published).toBe(true);
    expect(payload.site.site_name).toEqual({
      __i18n: { "zh-CN": "be-water", en: "be-water" },
    });
    expect(payload.pages).toHaveLength(PRODUCT_SITE_LOCALES.length * 2);

    const zhHome = payload.pages.find(
      (page) => page.locale === "zh-CN" && page.kind === "home",
    );
    expect(zhHome?.title).toContain("be-water");
    expect(zhHome?.sections.map((section) => section.type)).toEqual([
      "hero",
      "feature-grid",
      "steps",
      "cards",
      "spec-list",
      "band",
    ]);
    expect(zhHome?.sections[0]?.settings.headline).toContain("Agent-first");

    const enPricing = payload.pages.find(
      (page) => page.locale === "en" && page.slug === "pricing",
    );
    expect(enPricing?.title).toBe("Pricing");
    expect(enPricing?.sections[0]?.blocks).toHaveLength(5);
  });

  it("recognizes generic starter placeholder names", () => {
    expect(isGenericStarterSiteName("我的站点")).toBe(true);
    expect(isGenericStarterSiteName("My site")).toBe(true);
    expect(isGenericStarterSiteName("be-water")).toBe(false);
  });
});
