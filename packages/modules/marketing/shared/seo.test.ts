import { describe, expect, it } from "vitest";

import {
  buildCanonicalUrl,
  buildDocumentTitle,
  buildSiteJsonLd,
  normalizeOrigin,
} from "./seo.js";
import { SITE } from "./site.js";

describe("normalizeOrigin", () => {
  it("drops trailing slashes so joins never double up", () => {
    expect(normalizeOrigin("https://a.com/")).toBe("https://a.com");
    expect(normalizeOrigin("https://a.com///")).toBe("https://a.com");
    expect(normalizeOrigin("https://a.com")).toBe("https://a.com");
  });
});

describe("buildCanonicalUrl", () => {
  it("keeps the root path as a single slash", () => {
    expect(buildCanonicalUrl("https://a.com/", "/")).toBe("https://a.com/");
  });

  it("joins sub paths without duplicating slashes", () => {
    expect(buildCanonicalUrl("https://a.com/", "/pricing")).toBe(
      "https://a.com/pricing",
    );
    expect(buildCanonicalUrl("https://a.com", "/docs/quickstart")).toBe(
      "https://a.com/docs/quickstart",
    );
  });
});

describe("buildDocumentTitle", () => {
  it("uses the full site title on the landing page", () => {
    expect(buildDocumentTitle({ path: "/", title: "whatever" })).toBe(
      SITE.title,
    );
  });

  it("suffixes the site name elsewhere", () => {
    expect(buildDocumentTitle({ path: "/pricing", title: "定价" })).toBe(
      `定价 · ${SITE.name}`,
    );
  });
});

describe("buildSiteJsonLd", () => {
  it("emits a schema.org SoftwareApplication with an absolute url", () => {
    const jsonLd = buildSiteJsonLd("https://a.com/");

    expect(jsonLd["@type"]).toBe("SoftwareApplication");
    expect(jsonLd.url).toBe("https://a.com");
    expect(JSON.stringify(jsonLd)).not.toContain("undefined");
  });
});
