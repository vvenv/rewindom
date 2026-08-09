import { describe, expect, it } from "vitest";

import {
  normalizePageKind,
  pageContentIsDirty,
  promotePageContentData,
  resolvePageIdentity,
  revertPageContentData,
  validatePageSlug,
  validateSiteName,
  validateSiteTagline,
} from "./site.util.js";

describe("page slug identity", () => {
  it("accepts nested page slugs", () => {
    expect(validatePageSlug("page", "guides")).toBe("guides");
    expect(validatePageSlug("page", "guides/quickstart")).toBe(
      "guides/quickstart",
    );
    expect(validatePageSlug("page", "/Guides/Guide/")).toBe("guides/guide");
  });

  it("rejects reserved roots and bad segments", () => {
    expect(() => validatePageSlug("page", "app")).toThrow("site.slug_reserved");
    expect(() => validatePageSlug("page", "app/about")).toThrow(
      "site.slug_reserved",
    );
    expect(() => validatePageSlug("page", "docs")).toThrow("site.slug_reserved");
    expect(() => validatePageSlug("page", "docs/quickstart")).toThrow(
      "site.slug_reserved",
    );
    expect(() => validatePageSlug("page", "Bad_Slug")).toThrow(
      "site.slug_invalid",
    );
    expect(() => validatePageSlug("page", "a/b/c/d")).toThrow(
      "site.slug_invalid",
    );
  });

  it("rewrites legacy doc kind on write", () => {
    // kind="doc" 已废弃：写路径把它收敛成 "page",slug 原样保留
    // (早期 doc→docs 命名空间改写已移除,统一用 page kind)
    expect(resolvePageIdentity("doc", "index")).toEqual({
      kind: "page",
      slug: "index",
    });
    expect(resolvePageIdentity("doc", "guide")).toEqual({
      kind: "page",
      slug: "guide",
    });
    expect(normalizePageKind("doc", "index")).toBe("page");
  });
});

describe("page content draft", () => {
  it("detects when draft differs from published", () => {
    expect(
      pageContentIsDirty({
        title: "Live",
        description: "",
        sections: [],
        settings: {},
        title_draft: "Draft",
        description_draft: "",
        sections_draft: [],
        settings_draft: {},
      }),
    ).toBe(true);
    expect(
      pageContentIsDirty({
        title: "Same",
        description: "d",
        sections: [],
        settings: {},
        title_draft: "Same",
        description_draft: "d",
        sections_draft: [],
        settings_draft: {},
      }),
    ).toBe(false);
  });

  // 页面设置以前没有草稿列，改一下就直接对访客生效，且这里一律报「不脏」
  it("counts page settings as page content", () => {
    expect(
      pageContentIsDirty({
        title: "Same",
        description: "",
        sections: [],
        settings: { bg_color: "#fff" },
        title_draft: "Same",
        description_draft: "",
        sections_draft: [],
        settings_draft: { bg_color: "#000" },
      }),
    ).toBe(true);
  });

  it("promotes and reverts the whole content group", () => {
    const record = {
      title: "Live",
      description: "live desc",
      sections: [],
      settings: { bg_color: "#fff" },
      title_draft: "Draft",
      description_draft: "draft desc",
      sections_draft: [],
      settings_draft: { bg_color: "#000" },
    };
    expect(promotePageContentData(record)).toEqual({
      title: "Draft",
      description: "draft desc",
      sections: [],
      settings: { bg_color: "#000" },
    });
    expect(revertPageContentData(record)).toEqual({
      title: "Live",
      description: "live desc",
      sections: [],
      settings: { bg_color: "#fff" },
    });
  });
});

describe("validateSiteName", () => {
  it("keeps a plain string for the primary language", () => {
    expect(validateSiteName("  Acme  ", "zh-CN")).toBe("Acme");
  });

  it("stores __i18n when a second language is filled", () => {
    expect(
      validateSiteName(
        { __i18n: { "zh-CN": "艾克米", en: "Acme" } },
        "zh-CN",
      ),
    ).toEqual({ __i18n: { "zh-CN": "艾克米", en: "Acme" } });
  });

  it("collapses a single primary-locale entry back to a string", () => {
    expect(
      validateSiteName({ __i18n: { "zh-CN": "艾克米" } }, "zh-CN"),
    ).toBe("艾克米");
  });

  it("rejects an empty primary-language name", () => {
    expect(() => validateSiteName("", "zh-CN")).toThrow("site.name_invalid");
    expect(() =>
      validateSiteName({ __i18n: { en: "Acme" } }, "zh-CN"),
    ).toThrow("site.name_invalid");
  });
});

describe("validateSiteTagline", () => {
  it("allows an empty tagline", () => {
    expect(validateSiteTagline("", "zh-CN")).toBe("");
    expect(validateSiteTagline({ __i18n: {} }, "zh-CN")).toBe("");
  });

  it("stores __i18n when a second language is filled", () => {
    expect(
      validateSiteTagline(
        { __i18n: { "zh-CN": "标语", en: "Tagline" } },
        "zh-CN",
      ),
    ).toEqual({ __i18n: { "zh-CN": "标语", en: "Tagline" } });
  });

  it("collapses a single primary-locale entry back to a string", () => {
    expect(
      validateSiteTagline({ __i18n: { "zh-CN": "标语" } }, "zh-CN"),
    ).toBe("标语");
  });
});
