import { describe, expect, it } from "vitest";

import { createSection } from "../shared/section-schema.js";

import { renderPageSectionsHtml } from "./render-page-sections-html.js";

import type {
  PublicMarketingPage,
  PublicMarketingSite,
} from "../shared/site-cms.js";

function site(): PublicMarketingSite {
  return {
    site_name: "Demo",
    tagline: "",
    logo_url: null,
    primary_color: null,
    menus: [],
    theme_settings: {},
    default_locale: "zh-CN",
    locale: "zh-CN",
    available_locales: ["zh-CN"],
    header: [],
    footer: [],
    pages: [],
  };
}

function page(
  sections: PublicMarketingPage["sections"],
): PublicMarketingPage {
  return {
    slug: "home",
    locale: "zh-CN",
    kind: "home",
    title: "Home",
    description: "",
    path: "/",
    alternates: [{ locale: "zh-CN", path: "/" }],
    settings: {},
    visibility: "public",
    sections,
    updated_at: "2026-08-04T00:00:00.000Z",
  };
}

describe("renderPageSectionsHtml", () => {
  it("渲出与 SSR 同构的 section HTML", () => {
    const section = createSection("prose");
    const html = renderPageSectionsHtml(
      site(),
      page([
        {
          ...section,
          settings: { ...section.settings, body_md: "Hello member" },
        },
      ]),
    );
    expect(html).toContain("Hello member");
    expect(html).toContain("sec-band");
  });
});
