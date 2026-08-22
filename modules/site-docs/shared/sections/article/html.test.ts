import { describe, expect, it } from "vitest";

import { siteDocsContextEntry } from "../../site-docs-context.js";

import { renderSiteDocsArticleHtml } from "./html.js";

import type { PublicDocDetail } from "../../site-doc.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

const doc: PublicDocDetail = {
  slug: "getting-started",
  title: "Getting started",
  description: "",
  category: "",
  category_label: "",
  sort_order: 0,
  updated_at: "2026-01-01T00:00:00.000Z",
  body_md: "Next → [Host routing](/docs/host-routing)",
};

const section = {
  id: "s1",
  type: "site-docs.article",
  settings: {},
} as unknown as SiteSection;

function render(locale: "en" | "zh-CN", defaultLocale: "en" | "zh-CN"): string {
  return renderSiteDocsArticleHtml(section, {
    locale,
    defaultLocale,
    contributed: siteDocsContextEntry({ docs: [], doc, docsIndexPath: "/docs" }),
  });
}

describe("renderSiteDocsArticleHtml", () => {
  it("正文里的站内链接跟着当前语言补前缀", () => {
    expect(render("en", "zh-CN")).toContain('href="/en/docs/host-routing"');
  });

  it("站点主语言不带前缀——正文存的是逻辑路径", () => {
    expect(render("en", "en")).toContain('href="/docs/host-routing"');
    expect(render("zh-CN", "en")).toContain('href="/zh-CN/docs/host-routing"');
  });
});
