import { describe, expect, it } from "vitest";

import {
  buildDefaultProductSite,
  isGenericStarterSiteName,
  PRODUCT_SITE_LOCALES,
} from "./default-product-site-content.js";

describe("buildDefaultProductSite", () => {
  it("builds bilingual home pages with product copy", () => {
    const payload = buildDefaultProductSite();

    expect(payload.site.published).toBe(true);
    expect(payload.site.site_name).toEqual({
      __i18n: { "zh-CN": "Rewindom", en: "Rewindom" },
    });
    expect(payload.pages).toHaveLength(PRODUCT_SITE_LOCALES.length);

    const zhHome = payload.pages.find(
      (page) => page.locale === "zh-CN" && page.kind === "home",
    );
    expect(zhHome?.title).toContain("Rewindom");
    expect(zhHome?.sections.map((section) => section.type)).toEqual([
      "hero",
      "group",
      "prose",
      "prose",
      "group",
      "group",
      "prose",
      "band",
    ]);
    expect(zhHome?.sections[0]?.settings.headline).toContain("编码 Agent");
    expect(zhHome?.sections[0]?.settings.eyebrow).toContain("开源");
    expect(zhHome?.sections[0]?.settings.secondary_href).toBe(
      "https://github.com/vvenv/rewindom",
    );

    const headerGithub = payload.site.header
      ?.flatMap((section) => section.blocks)
      .find((block) => block.settings.href === "https://github.com/vvenv/rewindom");
    expect(headerGithub?.type).toBe("chrome_button");

    const showcase = zhHome?.sections.find(
      (section) => section.settings.anchor === "showcase",
    );
    expect(showcase?.type).toBe("group");
    expect(payload.pages.some((page) => page.slug === "pricing")).toBe(false);
  });

  it("recognizes generic starter placeholder names", () => {
    expect(isGenericStarterSiteName("我的站点")).toBe(true);
    expect(isGenericStarterSiteName("My site")).toBe(true);
    expect(isGenericStarterSiteName("Rewindom")).toBe(false);
  });
});
