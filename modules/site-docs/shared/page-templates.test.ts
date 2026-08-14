import { beforeAll, describe, expect, it } from "vitest";

import {
  isPublicCatalogPageKind,
  isTemplatePageKind,
} from "@rewindom/builtin/marketing/shared/page-templates.js";
import {
  canonicalizePageIdentity,
  marketingPagePath,
} from "@rewindom/builtin/marketing/shared/site-cms.js";

import {
  DOCS_ARTICLE_PAGE_KIND,
  DOCS_INDEX_PAGE_KIND,
  registerDocsPageTemplates,
} from "./page-templates.js";

describe("registerDocsPageTemplates", () => {
  beforeAll(() => {
    registerDocsPageTemplates();
  });

  it("登记后 kind 决定 slug 与路径", () => {
    expect(isTemplatePageKind(DOCS_INDEX_PAGE_KIND)).toBe(true);
    expect(isTemplatePageKind(DOCS_ARTICLE_PAGE_KIND)).toBe(true);
    expect(canonicalizePageIdentity(DOCS_INDEX_PAGE_KIND, "随便填")).toEqual({
      kind: DOCS_INDEX_PAGE_KIND,
      slug: "docs",
    });
    expect(marketingPagePath(DOCS_INDEX_PAGE_KIND, "docs")).toBe("/docs");
    expect(marketingPagePath(DOCS_ARTICLE_PAGE_KIND, "docs-article")).toBe(
      "/docs/:slug",
    );
  });

  it("文档索引进公开目录，详情模板不进", () => {
    expect(isPublicCatalogPageKind(DOCS_INDEX_PAGE_KIND)).toBe(true);
    expect(isPublicCatalogPageKind(DOCS_ARTICLE_PAGE_KIND)).toBe(false);
  });
});
