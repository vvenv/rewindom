import { beforeAll, describe, expect, it } from "vitest";

import {
  isPublicCatalogPageKind,
  isTemplatePageKind,
  getPageTemplateKind,
} from "@rewindom/builtin/marketing/shared/page-templates.js";
import { interpolationTokensFor } from "@rewindom/builtin/marketing/shared/interpolation-tokens.js";
import {
  canonicalizePageIdentity,
  marketingPagePath,
} from "@rewindom/builtin/marketing/shared/site-cms.js";

import {
  DOCS_ARTICLE_PAGE_KIND,
  DOCS_INDEX_PAGE_KIND,
  registerDocsPageTemplates,
} from "./page-templates.js";
import { SITE_DOCS_ENTITLEMENT } from "./entitlements.js";
import {
  docsInterpolationValues,
  emptySiteDocsContext,
} from "./site-docs-context.js";

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

  /*
   * 「登记了哪些 token」与「实际填了哪些」是两份清单，靠这条钉在一起——漂移不报错，
   * 只会让编辑器少列一项（租户无从知道能写），或多列一项（写下永远替不掉的花括号）。
   */
  it("site-docs 填的每个 token 都登记过，登记的每个也都有人填", () => {
    const filled = new Set(
      Object.keys(docsInterpolationValues(emptySiteDocsContext())),
    );
    const registered = interpolationTokensFor({
      pageKind: DOCS_ARTICLE_PAGE_KIND,
      entitlements: new Set([SITE_DOCS_ENTITLEMENT.key]),
    })
      .filter((token) => token.entitlement === SITE_DOCS_ENTITLEMENT.key)
      .map((token) => token.key);
    expect(registered.sort()).toEqual([...filled].sort());
  });

  it("没开通文档库的站点一个都不列", () => {
    expect(
      interpolationTokensFor({ pageKind: DOCS_ARTICLE_PAGE_KIND }).every(
        (token) => token.entitlement === undefined,
      ),
    ).toBe(true);
  });
});
