import { describe, expect, it } from "vitest";

import type {
  MarketingPageListItem,
  MarketingSite,
} from "../../shared/site-cms.js";
import type { SiteBlock, SiteSection } from "../../shared/sections/types.js";

import { hasSiteStarterContent } from "./site-content-state.js";

function page(
  partial: Partial<MarketingPageListItem> &
    Pick<MarketingPageListItem, "id" | "slug" | "locale" | "kind">,
): MarketingPageListItem {
  return {
    title: "T",
    description: "",
    settings: {},
    visibility: "public",
    status: "draft",
    content_dirty: false,
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function section(type: "header" | "footer", blocks: SiteBlock[]): SiteSection {
  return { id: type, type, settings: {}, blocks };
}

function site(partial: Partial<MarketingSite> = {}): MarketingSite {
  return {
    id: "s1",
    tenant_id: "t1",
    site_name: "Site",
    tagline: "",
    logo_url: null,
    primary_color: null,
    theme_settings: {},
    default_locale: "zh-CN",
    header: [section("header", [])],
    footer: [section("footer", [])],
    menus: [],
    chrome_dirty: false,
    published: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("hasSiteStarterContent", () => {
  it("is false for a fresh site: no pages, empty header/footer", () => {
    expect(hasSiteStarterContent(site(), [], "zh-CN")).toBe(false);
  });

  it("is false while the site query is still loading", () => {
    expect(hasSiteStarterContent(undefined, [], "zh-CN")).toBe(false);
  });

  it("is true once the primary-language home page exists", () => {
    const pages = [
      page({ id: "h", slug: "home", locale: "zh-CN", kind: "home" }),
    ];
    expect(hasSiteStarterContent(site(), pages, "zh-CN")).toBe(true);
  });

  it("ignores a home page in another language", () => {
    const pages = [page({ id: "h", slug: "home", locale: "en", kind: "home" })];
    expect(hasSiteStarterContent(site(), pages, "zh-CN")).toBe(false);
  });

  it("is true when the header has been arranged", () => {
    const arranged = site({
      header: [section("header", [{ id: "b1", type: "logo", settings: {} }])],
    });
    expect(hasSiteStarterContent(arranged, [], "zh-CN")).toBe(true);
  });

  it("is true when the footer has been arranged", () => {
    const arranged = site({
      footer: [section("footer", [{ id: "b1", type: "text", settings: {} }])],
    });
    expect(hasSiteStarterContent(arranged, [], "zh-CN")).toBe(true);
  });
});
