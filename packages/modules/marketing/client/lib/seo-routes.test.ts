import { describe, expect, it } from "vitest";

import { DOC_PAGES } from "./docs.js";
import { MARKETING_ROUTES, findMarketingRoute } from "./seo-routes.js";

describe("MARKETING_ROUTES", () => {
  it("covers every document page", () => {
    for (const page of DOC_PAGES) {
      expect(findMarketingRoute(page.path), page.path).toBeDefined();
    }
  });

  it("covers the landing, pricing and docs index pages", () => {
    for (const path of ["/", "/pricing", "/docs"]) {
      expect(findMarketingRoute(path), path).toBeDefined();
    }
  });

  it("uses absolute paths without trailing slashes", () => {
    for (const route of MARKETING_ROUTES) {
      expect(route.path.startsWith("/"), route.path).toBe(true);
      if (route.path !== "/") {
        expect(route.path.endsWith("/"), route.path).toBe(false);
      }
      expect(route.path).not.toContain(":");
    }
  });

  it("has no duplicated paths", () => {
    const paths = MARKETING_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("gives every route a title and an indexable description", () => {
    for (const route of MARKETING_ROUTES) {
      expect(route.title, route.path).not.toBe("");
      expect(route.description.length, route.path).toBeGreaterThan(20);
      // 超过 160 字符会被搜索结果截断
      expect(route.description.length, route.path).toBeLessThanOrEqual(160);
    }
  });

  it("keeps sitemap priorities within range, landing highest", () => {
    for (const route of MARKETING_ROUTES) {
      expect(route.priority, route.path).toBeGreaterThan(0);
      expect(route.priority, route.path).toBeLessThanOrEqual(1);
    }
    expect(findMarketingRoute("/")!.priority).toBe(
      Math.max(...MARKETING_ROUTES.map((route) => route.priority)),
    );
  });

  it("builds serialisable JSON-LD with absolute urls", () => {
    for (const route of MARKETING_ROUTES) {
      if (!route.buildJsonLd) {
        continue;
      }
      const serialised = JSON.stringify(route.buildJsonLd("https://a.com/"));

      expect(serialised, route.path).toContain('"@context"');
      expect(serialised, route.path).not.toContain("undefined");
      expect(serialised, route.path).not.toContain("a.com//");
    }
  });

  it("never lets JSON-LD break out of the script tag", () => {
    for (const route of MARKETING_ROUTES) {
      if (!route.buildJsonLd) {
        continue;
      }
      expect(
        JSON.stringify(route.buildJsonLd("https://a.com")),
        route.path,
      ).not.toContain("</script");
    }
  });
});
