/**
 * 文档库塞进 `SectionRenderContext.contributed["site-docs"]` 的形状。
 *
 * 贡献方自己读自己的那一格，别让每个渲染器各写一遍 `as`。
 */

import { SITE_INTERPOLATION_KEY } from "@rewindom/builtin/marketing/shared/site-interpolation.js";
import { DOCS_INDEX_PATH, type PublicDocDetail, type PublicDocSummary } from "./site-doc.js";

import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const SITE_DOCS_CONTEXT_KEY = "site-docs";

export interface SiteDocsRenderContext {
  docs: PublicDocSummary[];
  doc?: PublicDocDetail;
  docsIndexPath: string;
  /** 页头搜索落到 `/docs?q=` 时的词；列表段 SSR 据此过滤。 */
  query?: string;
}

export function readSiteDocsContext(
  ctx: Pick<SectionRenderContext, "contributed">,
): SiteDocsRenderContext | null {
  const value = ctx.contributed?.[SITE_DOCS_CONTEXT_KEY];
  return value ? (value as SiteDocsRenderContext) : null;
}

export function docsInterpolationValues(
  context: SiteDocsRenderContext,
): Record<string, string> {
  return {
    doc: context.doc?.title ?? "",
    doc_description: context.doc?.description ?? "",
  };
}

export function siteDocsContextEntry(
  context: SiteDocsRenderContext,
): Record<string, unknown> {
  return {
    [SITE_DOCS_CONTEXT_KEY]: context,
    [SITE_INTERPOLATION_KEY]: docsInterpolationValues(context),
  };
}

export function emptySiteDocsContext(
  overrides: Partial<SiteDocsRenderContext> = {},
): SiteDocsRenderContext {
  return {
    docs: [],
    docsIndexPath: DOCS_INDEX_PATH,
    ...overrides,
  };
}
