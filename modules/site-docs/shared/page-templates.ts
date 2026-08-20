/**
 * 文档库两张页面（索引 / 详情）的**模板页**登记与兜底版式。
 *
 * 与会员页同一套机制（`marketing/shared/page-templates.ts`）：kind 唯一、slug
 * 固定——对该站点相关时由 marketing 快照落库；记录尚未落库时 SSR 按这里的预设
 * 兜底。自定义之后就是一张普通页面记录，走同一个编辑器、同一套发布流程。
 *
 * 元数据在**两端**都要登记（写路径要按 kind 校验 slug，中台要列出这几行），所以由
 * `registerDocsPageTemplates()` 统一暴露，server 的 `onBoot` 与 client manifest
 * 各调一次；重复登记是幂等的。
 */

import { SITE_DOCS_ENTITLEMENT } from "./entitlements.js";
import {
  DOCS_ARTICLE_PAGE_KIND,
  DOCS_INDEX_PAGE_KIND,
} from "./page-kinds.js";
import { SITE_DOCS_ARTICLE_SECTION_TYPE } from "./sections/article/definition.js";
import { SITE_DOCS_LIST_SECTION_TYPE } from "./sections/list/definition.js";
import { SITE_DOCS_NAV_SECTION_TYPE } from "./sections/nav/definition.js";
import { SITE_DOCS_TOC_SECTION_TYPE } from "./sections/toc/definition.js";
import { DOCS_INDEX_PATH } from "./site-doc.js";

import {
  registerPageTemplateKind,
  registerPageTemplatePreset,
} from "@rewindom/builtin/marketing/shared/page-templates.js";
import {
  registerInterpolationTokens,
  type InterpolationTokenDefinition,
} from "@rewindom/builtin/marketing/shared/interpolation-tokens.js";
import { buildPresetSections } from "@rewindom/builtin/marketing/shared/page-presets.js";

import type { PagePreset, PresetTranslateFn } from "@rewindom/builtin/marketing/shared/page-presets.types.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const DOCS_PAGE_TEMPLATE_GROUP = "site-docs:template.group";

export { DOCS_ARTICLE_PAGE_KIND, DOCS_INDEX_PAGE_KIND };

export const DOCS_INDEX_TEMPLATE_SLUG = "docs";
export const DOCS_ARTICLE_TEMPLATE_SLUG = "docs-article";

export const DOCS_ARTICLE_PATH = `${DOCS_INDEX_PATH}/:slug`;

export const DOCS_INDEX_TEMPLATE_PRESET: PagePreset = {
  key: DOCS_INDEX_PAGE_KIND,
  label: "site-docs:template.index.label",
  kind: DOCS_INDEX_PAGE_KIND,
  slug: DOCS_INDEX_TEMPLATE_SLUG,
  titleKey: "site-docs:template.index.title",
  descriptionKey: "site-docs:template.index.description",
  sections: [
    {
      type: "page-header",
    },
    {
      type: SITE_DOCS_LIST_SECTION_TYPE,
      raw: {
        group_by: "category",
        style: "cards",
        columns: 2,
        show_description: true,
      },
    },
  ],
};

export const DOCS_ARTICLE_TEMPLATE_PRESET: PagePreset = {
  key: DOCS_ARTICLE_PAGE_KIND,
  label: "site-docs:template.article.label",
  kind: DOCS_ARTICLE_PAGE_KIND,
  slug: DOCS_ARTICLE_TEMPLATE_SLUG,
  titleKey: "site-docs:template.article.title",
  descriptionKey: "site-docs:template.article.description",
  sections: [
    {
      type: "group",
      raw: {
        columns_layout: "2:8:2",
        column_gap: 40,
        align_items: "stretch",
        padding_top: 48,
        padding_bottom: 48,
      },
      blocks: [
        {
          type: "column",
          raw: { show_divider: true },
          sections: [
            {
              type: SITE_DOCS_NAV_SECTION_TYPE,
              raw: { sticky: true, show_category: true },
            },
          ],
        },
        {
          type: "column",
          raw: { show_divider: true },
          sections: [{ type: SITE_DOCS_ARTICLE_SECTION_TYPE }],
        },
        {
          type: "column",
          sections: [
            { type: SITE_DOCS_TOC_SECTION_TYPE, raw: { sticky: true } },
          ],
        },
      ],
    },
  ],
};

const PRESETS: Record<string, PagePreset> = {
  [DOCS_INDEX_PAGE_KIND]: DOCS_INDEX_TEMPLATE_PRESET,
  [DOCS_ARTICLE_PAGE_KIND]: DOCS_ARTICLE_TEMPLATE_PRESET,
};

export function isDocsTemplateKind(kind: string): boolean {
  return kind === DOCS_INDEX_PAGE_KIND || kind === DOCS_ARTICLE_PAGE_KIND;
}

/** 兜底版式落成真实 sections。 */
export function buildDocsTemplateSections(
  kind: typeof DOCS_INDEX_PAGE_KIND | typeof DOCS_ARTICLE_PAGE_KIND,
  t: PresetTranslateFn,
): SiteSection[] {
  return buildPresetSections(PRESETS[kind]!, t);
}

/**
 * site-docs 贡献的 `{token}`，与 `docsInterpolationValues()` 填的那批**一一对应**
 *（`page-templates.test.ts` 钉了这条：多一个少一个都红）。
 */
const SITE_DOCS_INTERPOLATION_TOKENS: readonly InterpolationTokenDefinition[] = [
  {
    key: "doc",
    label: "site-docs:token.doc",
    page_kinds: [DOCS_ARTICLE_PAGE_KIND],
    entitlement: SITE_DOCS_ENTITLEMENT.key,
  },
  {
    key: "doc_description",
    label: "site-docs:token.doc_description",
    page_kinds: [DOCS_ARTICLE_PAGE_KIND],
    entitlement: SITE_DOCS_ENTITLEMENT.key,
  },
];

/** 登记两张模板页（幂等）；server `onBoot` 与 client manifest 各调一次。 */
export function registerDocsPageTemplates(): void {
  registerPageTemplateKind({
    kind: DOCS_INDEX_PAGE_KIND,
    slug: DOCS_INDEX_TEMPLATE_SLUG,
    path: DOCS_INDEX_PATH,
    group: DOCS_PAGE_TEMPLATE_GROUP,
    label: "site-docs:template.index.label",
    required_section: null,
    entitlement: SITE_DOCS_ENTITLEMENT.key,
  });
  registerPageTemplateKind({
    kind: DOCS_ARTICLE_PAGE_KIND,
    slug: DOCS_ARTICLE_TEMPLATE_SLUG,
    path: DOCS_ARTICLE_PATH,
    group: DOCS_PAGE_TEMPLATE_GROUP,
    label: "site-docs:template.article.label",
    required_section: null,
    entitlement: SITE_DOCS_ENTITLEMENT.key,
  });
  registerInterpolationTokens(SITE_DOCS_INTERPOLATION_TOKENS);
  registerPageTemplatePreset(DOCS_INDEX_PAGE_KIND, DOCS_INDEX_TEMPLATE_PRESET);
  registerPageTemplatePreset(
    DOCS_ARTICLE_PAGE_KIND,
    DOCS_ARTICLE_TEMPLATE_PRESET,
  );
}
