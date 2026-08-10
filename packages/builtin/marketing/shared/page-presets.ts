import {
  DOC_TEMPLATE_SLUGS,
  registerPageTemplatePreset,
  type DocTemplateKind,
} from "./page-templates.js";
import {
  createBlock,
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SettingValues,
  type SiteSection,
} from "./section-schema.js";

import type {
  PagePreset,
  PresetSection,
  PresetTranslateFn,
} from "./page-presets.types.js";

export type {
  PagePreset,
  PresetBlock,
  PresetSection,
  PresetTranslateFn,
} from "./page-presets.types.js";

export const PAGE_PRESETS: PagePreset[] = [
  {
    /*
     * 起步首页刻意只有三段。
     *
     * 它是**起点**，不是成品：租户第一件事是把文案换成自己的，段数越多越像
     * 「改别人的站」，改不完就干脆整页删掉重来。原来这页有六段十八块，还写死了
     * 本仓自己的技术栈（Fastify / Prisma / `pnpm gen:module`），对任何真实租户
     * 都是噪音。想要文档 / 定价 / 关于的，从「页面预设」里按需加——那些预设都还在。
     */
    key: "home",
    label: "preset.home.label",
    kind: "home",
    slug: "home",
    titleKey: "preset.home.title",
    descriptionKey: "preset.home.description",
    sections: [
      {
        type: "hero",
        text: {
          headline: "preset.home.hero.headline",
          subhead: "preset.home.hero.subhead",
          primary_label: "preset.home.hero.primary_label",
        },
        raw: {
          // 起步模板只建首页，站内没有别的地址可指；页内锚点是单页站的通行写法
          primary_href: "#contact",
          align: "left",
          show_glow: true,
        },
      },
      {
        type: "feature-grid",
        text: {
          heading: "preset.home.features.heading",
          subheading: "preset.home.features.subheading",
        },
        raw: { columns: 3, show_icons: true },
        blocks: [
          {
            type: "feature",
            text: {
              title: "preset.home.features.f1_title",
              body: "preset.home.features.f1_body",
            },
            raw: { icon: "Sparkles" },
          },
          {
            type: "feature",
            text: {
              title: "preset.home.features.f2_title",
              body: "preset.home.features.f2_body",
            },
            raw: { icon: "Layers" },
          },
          {
            type: "feature",
            text: {
              title: "preset.home.features.f3_title",
              body: "preset.home.features.f3_body",
            },
            raw: { icon: "Users" },
          },
        ],
      },
      {
        type: "band",
        text: {
          headline: "preset.home.cta.headline",
          body: "preset.home.cta.body",
          primary_label: "preset.home.cta.primary_label",
        },
        raw: {
          anchor: "contact",
          primary_href: "mailto:hello@example.com",
          align: "center",
          background: "muted",
        },
      },
    ],
  },

  {
    /*
     * 各套餐的按钮指 `/contact` 而不是 `/register`：`/register` 是**工作台的员工
     * 注册页**（`apps/client/src/shell/guest-routes.tsx`），租户站点的访客点进去
     * 会看到 SaaS 运营方的注册表单。站点自己的会员注册在 `/member/register`，
     * 且只在开通会员后才存在，不能写死进预设。
     */
    key: "pricing",
    label: "preset.pricing.label",
    kind: "page",
    slug: "pricing",
    titleKey: "preset.pricing.title",
    descriptionKey: "preset.pricing.description",
    sections: [
      {
        type: "pricing",
        text: {
          heading: "preset.pricing.heading",
          subheading: "preset.pricing.subheading",
          footnote: "preset.pricing.footnote",
          featured_badge: "preset.pricing.badge",
        },
        raw: { columns: 3 },
        blocks: [
          {
            type: "plan",
            text: {
              name: "preset.pricing.p1_name",
              audience: "preset.pricing.p1_audience",
              price: "preset.pricing.p1_price",
              highlights: "preset.pricing.p1_highlights",
              primary_label: "preset.pricing.cta_start",
            },
            raw: { primary_href: "/contact", featured: false },
          },
          {
            type: "plan",
            text: {
              name: "preset.pricing.p2_name",
              audience: "preset.pricing.p2_audience",
              price: "preset.pricing.p2_price",
              price_note: "preset.pricing.per_month",
              highlights: "preset.pricing.p2_highlights",
              primary_label: "preset.pricing.cta_start",
            },
            raw: { primary_href: "/contact", featured: true },
          },
          {
            type: "plan",
            text: {
              name: "preset.pricing.p3_name",
              audience: "preset.pricing.p3_audience",
              price: "preset.pricing.p3_price",
              highlights: "preset.pricing.p3_highlights",
              primary_label: "preset.pricing.cta_contact",
            },
            raw: { primary_href: "/contact", featured: false },
          },
        ],
      },
      {
        type: "faq",
        text: { heading: "preset.pricing.faq_heading" },
        blocks: [
          {
            type: "qa",
            text: {
              question: "preset.pricing.faq1_q",
              answer: "preset.pricing.faq1_a",
            },
          },
          {
            type: "qa",
            text: {
              question: "preset.pricing.faq2_q",
              answer: "preset.pricing.faq2_a",
            },
          },
        ],
      },
    ],
  },

  {
    key: "about",
    label: "preset.about.label",
    kind: "page",
    slug: "about",
    titleKey: "preset.about.title",
    descriptionKey: "preset.about.description",
    sections: [
      {
        type: "hero",
        text: {
          headline: "preset.about.hero_headline",
          subhead: "preset.about.hero_subhead",
        },
        raw: { align: "left", show_glow: false },
      },
      {
        type: "group",
        raw: { columns_layout: "6:6", padding_top: 16, padding_bottom: 16 },
        blocks: [
          {
            type: "column",
            sections: [
              {
                type: "band",
                text: {
                  headline: "preset.about.intro_title",
                  body: "preset.about.intro_body",
                },
                raw: { align: "left", background: "none" },
              },
            ],
          },
          {
            type: "column",
            sections: [
              {
                type: "prose",
                text: { body_md: "preset.about.intro_aside" },
              },
            ],
          },
        ],
      },
      {
        type: "feature-grid",
        text: { heading: "preset.about.values_heading" },
        raw: { columns: 3, show_icons: true },
        blocks: [
          {
            type: "feature",
            text: {
              title: "preset.about.v1_title",
              body: "preset.about.v1_body",
            },
            raw: { icon: "Sparkles" },
          },
          {
            type: "feature",
            text: {
              title: "preset.about.v2_title",
              body: "preset.about.v2_body",
            },
            raw: { icon: "Users" },
          },
          {
            type: "feature",
            text: {
              title: "preset.about.v3_title",
              body: "preset.about.v3_body",
            },
            raw: { icon: "Shield" },
          },
        ],
      },
    ],
  },

  {
    key: "contact",
    label: "preset.contact.label",
    kind: "page",
    slug: "contact",
    titleKey: "preset.contact.title",
    descriptionKey: "preset.contact.description",
    sections: [
      {
        type: "hero",
        text: {
          headline: "preset.contact.hero_headline",
          subhead: "preset.contact.hero_subhead",
        },
        raw: { align: "left", show_glow: false },
      },
      {
        type: "cards",
        raw: { columns: 3, card_style: "bordered" },
        blocks: [
          {
            type: "card",
            text: {
              title: "preset.contact.c1_title",
              body: "preset.contact.c1_body",
            },
            raw: { href: "mailto:hello@example.com" },
          },
          {
            type: "card",
            text: {
              title: "preset.contact.c2_title",
              body: "preset.contact.c2_body",
            },
          },
          {
            type: "card",
            text: {
              title: "preset.contact.c3_title",
              body: "preset.contact.c3_body",
            },
          },
        ],
      },
      {
        type: "faq",
        text: { heading: "preset.contact.faq_heading" },
        blocks: [
          {
            type: "qa",
            text: {
              question: "preset.contact.faq1_q",
              answer: "preset.contact.faq1_a",
            },
          },
        ],
      },
    ],
  },
];

/**
 * 文档库两张模板页的**默认版式**。
 *
 * 与 `PAGE_PRESETS` 分开是因为它们不是「可选的起步模板」而是**兜底**：租户没自定义
 * 过版式时，`/docs` 与 `/docs/:slug` 直接按这里渲染（见 `server/marketing-doc.ssr.ts`）。
 * 所以这里不进「页面预设」菜单——那个菜单是让人往普通页面上铺内容的。
 *
 * 也正因为是兜底，这两份版式不落库：不给没用文档的租户塞两张空页，也就不需要
 * 为存量租户写数据迁移。租户想改，在编辑器里保存一次即成为一条真实页面记录。
 */
export const DOC_TEMPLATE_PRESETS: Record<DocTemplateKind, PagePreset> = {
  doc_index: {
    key: "doc_index",
    label: "preset.doc_index.label",
    kind: "doc_index",
    slug: DOC_TEMPLATE_SLUGS.doc_index,
    titleKey: "preset.doc_index.title",
    descriptionKey: "preset.doc_index.description",
    sections: [
      {
        type: "page-header",
        text: {
          headline: "preset.doc_index.headline",
          subhead: "preset.doc_index.subhead",
        },
      },
      {
        type: "doc-list",
        raw: {
          group_by: "category",
          style: "cards",
          columns: 2,
          show_description: true,
        },
      },
    ],
  },
  doc_article: {
    key: "doc_article",
    label: "preset.doc_article.label",
    kind: "doc_article",
    slug: DOC_TEMPLATE_SLUGS.doc_article,
    titleKey: "preset.doc_article.title",
    descriptionKey: "preset.doc_article.description",
    sections: [
      {
        /*
         * 三栏：左目录 + 正文 + 右章节导航——文档站的通行版式。
         *
         * 两个导航都是**独立的段**，不想要就在编辑器里删掉，不需要另开开关；
         * 窄屏由 group 自己堆叠成上下（见 base.css 的 `.grp`），吸顶也自动失效。
         */
        type: "group",
        raw: {
          columns_layout: "3:7:2",
          column_gap: 40,
          align_items: "stretch",
        },
        blocks: [
          {
            type: "column",
            raw: { show_divider: true },
            sections: [
              { type: "doc-nav", raw: { sticky: true, show_category: true } },
            ],
          },
          {
            type: "column",
            raw: { show_divider: true },
            sections: [{ type: "doc-article" }],
          },
          {
            type: "column",
            sections: [{ type: "doc-toc", raw: { sticky: true } }],
          },
        ],
      },
    ],
  },
};

/** 兜底版式落成真实 sections（同 `buildPresetSections`，只是入口按 kind 取）。 */
export function buildDocTemplateSections(
  kind: DocTemplateKind,
  t: PresetTranslateFn,
): SiteSection[] {
  return buildPresetSections(DOC_TEMPLATE_PRESETS[kind], t);
}

/*
 * 把兜底版式登记进模板页注册表，中台的「自定义版式」按钮按 kind 取它建页。
 * 元数据（slug / path）在 `page-templates.ts` 里就登记好了，与预设分开的理由见那边。
 */
registerPageTemplatePreset("doc_index", DOC_TEMPLATE_PRESETS.doc_index);
registerPageTemplatePreset("doc_article", DOC_TEMPLATE_PRESETS.doc_article);

function resolveValues(
  t: PresetTranslateFn,
  text: Record<string, string> | undefined,
  raw: SettingValues | undefined,
): SettingValues {
  const out: SettingValues = { ...(raw ?? {}) };
  for (const [id, key] of Object.entries(text ?? {})) {
    out[id] = t(key);
  }
  return out;
}

function buildPresetSection(
  spec: PresetSection,
  t: PresetTranslateFn,
): SiteSection {
  const base = createSection(spec.type);
  const blocks = spec.blocks
    ? spec.blocks.map((block) => {
        const created = createBlock(
          spec.type,
          block.type,
          resolveValues(t, block.text, block.raw),
        );
        // 容器 block（列）里的子段同样走一遍预设展开
        return block.sections
          ? {
              ...created,
              sections: block.sections.map((child) =>
                buildPresetSection(child, t),
              ),
            }
          : created;
      })
    : base.blocks;
  // `createSection` 已经对认不出来的 type 抛过了，这里的定义必然存在
  const definition = getSectionDefinition(spec.type)!;
  return {
    ...base,
    settings: parseSettingValues(definition.settings, {
      ...base.settings,
      ...resolveValues(t, spec.text, spec.raw),
    }),
    blocks,
  };
}

/** 把预设落成真实 sections（文案已翻译，id 已生成，值过一遍 schema 校验）。 */
export function buildPresetSections(
  preset: PagePreset,
  t: PresetTranslateFn,
): SiteSection[] {
  return preset.sections.map((spec) => buildPresetSection(spec, t));
}

export function findPagePreset(key: string): PagePreset | undefined {
  return PAGE_PRESETS.find((preset) => preset.key === key);
}
