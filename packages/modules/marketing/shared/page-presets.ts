import {
  createBlock,
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type PageSectionType,
  type SettingValues,
  type SiteSection,
} from "./section-schema.js";

import type { MarketingPageKind } from "./site-cms.js";

/** 解析预设里的 i18n key；客户端传 `t`，服务端传 locale 查表函数。 */
export type PresetTranslateFn = (key: string) => string;

/**
 * 页面预设：一键铺出「默认官网」那套版式。
 *
 * 预设只描述**结构 + i18n key**，文案在创建时用 `t()` 落成当前语言的实际值——
 * schema 与存储层不掺 i18n，租户拿到的是可以随便改的普通内容。
 */

interface PresetBlock {
  type: string;
  /** setting id → i18n key（值会被 `t()` 解析） */
  text?: Record<string, string>;
  /** setting id → 字面量（图标名、布尔、数字这类不翻译的值） */
  raw?: SettingValues;
  /** 仅容器 block（`group` 的列）：列里装的子段。 */
  sections?: PresetSection[];
}

interface PresetSection {
  type: PageSectionType;
  text?: Record<string, string>;
  raw?: SettingValues;
  blocks?: PresetBlock[];
}

export interface PagePreset {
  key: string;
  /** i18n key */
  label: string;
  kind: MarketingPageKind;
  slug: string;
  titleKey: string;
  descriptionKey: string;
  sections: PresetSection[];
}

const K = "preset";

export const PAGE_PRESETS: PagePreset[] = [
  {
    key: "home",
    label: `${K}.home.label`,
    kind: "home",
    slug: "home",
    titleKey: `${K}.home.title`,
    descriptionKey: `${K}.home.description`,
    sections: [
      {
        type: "hero",
        text: {
          eyebrow: `${K}.home.hero.eyebrow`,
          headline: `${K}.home.hero.headline`,
          subhead: `${K}.home.hero.subhead`,
          primary_label: `${K}.home.hero.primary_label`,
          secondary_label: `${K}.home.hero.secondary_label`,
        },
        raw: {
          primary_href: "/register",
          secondary_href: "/docs",
          align: "left",
          show_glow: true,
        },
        blocks: [
          {
            type: "stat",
            text: {
              term: `${K}.home.hero.stat1_term`,
              detail: `${K}.home.hero.stat1_detail`,
            },
          },
          {
            type: "stat",
            text: {
              term: `${K}.home.hero.stat2_term`,
              detail: `${K}.home.hero.stat2_detail`,
            },
          },
          {
            type: "stat",
            text: {
              term: `${K}.home.hero.stat3_term`,
              detail: `${K}.home.hero.stat3_detail`,
            },
          },
        ],
      },
      {
        type: "steps",
        text: {
          heading: `${K}.home.steps.heading`,
          subheading: `${K}.home.steps.subheading`,
          primary_label: `${K}.home.steps.primary_label`,
        },
        raw: { primary_href: "/docs", columns: 3, show_number: true },
        blocks: [
          {
            type: "step",
            text: {
              title: `${K}.home.steps.s1_title`,
              body: `${K}.home.steps.s1_body`,
            },
            raw: { code: "pnpm gen:module" },
          },
          {
            type: "step",
            text: {
              title: `${K}.home.steps.s2_title`,
              body: `${K}.home.steps.s2_body`,
            },
            raw: { code: "pnpm check:modules" },
          },
          {
            type: "step",
            text: {
              title: `${K}.home.steps.s3_title`,
              body: `${K}.home.steps.s3_body`,
            },
            raw: { code: "pnpm dev" },
          },
        ],
      },
      {
        type: "feature-grid",
        text: {
          heading: `${K}.home.features.heading`,
          subheading: `${K}.home.features.subheading`,
        },
        raw: { columns: 3, show_icons: true },
        blocks: [
          {
            type: "feature",
            text: {
              title: `${K}.home.features.f1_title`,
              body: `${K}.home.features.f1_body`,
            },
            raw: { icon: "Bot" },
          },
          {
            type: "feature",
            text: {
              title: `${K}.home.features.f2_title`,
              body: `${K}.home.features.f2_body`,
            },
            raw: { icon: "Layers" },
          },
          {
            type: "feature",
            text: {
              title: `${K}.home.features.f3_title`,
              body: `${K}.home.features.f3_body`,
            },
            raw: { icon: "Blocks" },
          },
          {
            type: "feature",
            text: {
              title: `${K}.home.features.f4_title`,
              body: `${K}.home.features.f4_body`,
            },
            raw: { icon: "Plug" },
          },
          {
            type: "feature",
            text: {
              title: `${K}.home.features.f5_title`,
              body: `${K}.home.features.f5_body`,
            },
            raw: { icon: "Shield" },
          },
          {
            type: "feature",
            text: {
              title: `${K}.home.features.f6_title`,
              body: `${K}.home.features.f6_body`,
            },
            raw: { icon: "Server" },
          },
        ],
      },
      {
        type: "spec-list",
        text: {
          heading: `${K}.home.spec.heading`,
          subheading: `${K}.home.spec.subheading`,
          primary_label: `${K}.home.spec.primary_label`,
        },
        raw: { primary_href: "/docs", layout: "split" },
        blocks: [
          {
            type: "row",
            text: { term: `${K}.home.spec.r1_term` },
            raw: { detail: "Fastify · Prisma · PostgreSQL" },
          },
          {
            type: "row",
            text: { term: `${K}.home.spec.r2_term` },
            raw: { detail: "React · Vite · React Router" },
          },
          {
            type: "row",
            text: { term: `${K}.home.spec.r3_term` },
            raw: { detail: "Tailwind CSS · shadcn/ui" },
          },
          {
            type: "row",
            text: { term: `${K}.home.spec.r4_term` },
            raw: { detail: "Docker Compose" },
          },
        ],
      },
      {
        type: "cards",
        text: { heading: `${K}.home.docs.heading` },
        raw: { columns: 2, card_style: "bordered" },
        blocks: [
          {
            type: "card",
            text: {
              title: `${K}.home.docs.c1_title`,
              body: `${K}.home.docs.c1_body`,
            },
            raw: { href: "/docs/quickstart" },
          },
          {
            type: "card",
            text: {
              title: `${K}.home.docs.c2_title`,
              body: `${K}.home.docs.c2_body`,
            },
            raw: { href: "/docs/modules" },
          },
        ],
      },
      {
        type: "band",
        text: {
          headline: `${K}.home.cta.headline`,
          body: `${K}.home.cta.body`,
          primary_label: `${K}.home.cta.primary_label`,
          secondary_label: `${K}.home.cta.secondary_label`,
        },
        raw: {
          primary_href: "/register",
          secondary_href: "/pricing",
          align: "center",
          background: "muted",
        },
      },
    ],
  },

  {
    key: "pricing",
    label: `${K}.pricing.label`,
    kind: "page",
    slug: "pricing",
    titleKey: `${K}.pricing.title`,
    descriptionKey: `${K}.pricing.description`,
    sections: [
      {
        type: "pricing",
        text: {
          heading: `${K}.pricing.heading`,
          subheading: `${K}.pricing.subheading`,
          footnote: `${K}.pricing.footnote`,
          featured_badge: `${K}.pricing.badge`,
        },
        raw: { columns: 3 },
        blocks: [
          {
            type: "plan",
            text: {
              name: `${K}.pricing.p1_name`,
              audience: `${K}.pricing.p1_audience`,
              price: `${K}.pricing.p1_price`,
              highlights: `${K}.pricing.p1_highlights`,
              primary_label: `${K}.pricing.cta_start`,
            },
            raw: { primary_href: "/register", featured: false },
          },
          {
            type: "plan",
            text: {
              name: `${K}.pricing.p2_name`,
              audience: `${K}.pricing.p2_audience`,
              price: `${K}.pricing.p2_price`,
              price_note: `${K}.pricing.per_month`,
              highlights: `${K}.pricing.p2_highlights`,
              primary_label: `${K}.pricing.cta_start`,
            },
            raw: { primary_href: "/register", featured: true },
          },
          {
            type: "plan",
            text: {
              name: `${K}.pricing.p3_name`,
              audience: `${K}.pricing.p3_audience`,
              price: `${K}.pricing.p3_price`,
              highlights: `${K}.pricing.p3_highlights`,
              primary_label: `${K}.pricing.cta_contact`,
            },
            raw: { primary_href: "/contact", featured: false },
          },
        ],
      },
      {
        type: "faq",
        text: { heading: `${K}.pricing.faq_heading` },
        blocks: [
          {
            type: "qa",
            text: {
              question: `${K}.pricing.faq1_q`,
              answer: `${K}.pricing.faq1_a`,
            },
          },
          {
            type: "qa",
            text: {
              question: `${K}.pricing.faq2_q`,
              answer: `${K}.pricing.faq2_a`,
            },
          },
        ],
      },
    ],
  },

  {
    key: "docs",
    label: `${K}.docs.label`,
    kind: "page",
    slug: "docs",
    titleKey: `${K}.docs.title`,
    descriptionKey: `${K}.docs.description`,
    sections: [
      // 标题不再自动出，预设自己带一段；文案留空 = 跟随页面设置里的标题
      { type: "page-header", raw: { align: "left" } },
      {
        // 条目来自已发布的子页（如 docs/quickstart）
        type: "page-menu",
        text: { subheading: `${K}.docs.subheading` },
        raw: { source: "children", style: "cards", columns: 2 },
      },
    ],
  },

  {
    // 文档详情：左同级菜单 + 右正文（MODULE.md「1:3 group」口径）
    key: "docs-detail",
    label: `${K}.docs_detail.label`,
    kind: "page",
    slug: "docs/guide",
    titleKey: `${K}.docs_detail.title`,
    descriptionKey: `${K}.docs_detail.description`,
    sections: [
      // 分栏开场没有 h1，标题得自己带一段（以前靠自动 page-head）
      { type: "page-header", raw: { align: "left" } },
      {
        type: "group",
        raw: { columns_layout: "1:3" },
        blocks: [
          {
            type: "column",
            raw: { sticky: true },
            sections: [
              {
                type: "page-menu",
                raw: { source: "siblings", style: "list", columns: 1 },
              },
            ],
          },
          {
            type: "column",
            sections: [
              {
                type: "prose",
                text: { body_md: `${K}.docs_detail.body_md` },
                raw: { content_width: "narrow" },
              },
            ],
          },
        ],
      },
    ],
  },

  {
    key: "about",
    label: `${K}.about.label`,
    kind: "page",
    slug: "about",
    titleKey: `${K}.about.title`,
    descriptionKey: `${K}.about.description`,
    sections: [
      {
        type: "hero",
        text: {
          headline: `${K}.about.hero_headline`,
          subhead: `${K}.about.hero_subhead`,
        },
        raw: { align: "left", show_glow: false },
      },
      {
        type: "group",
        raw: { columns_layout: "1:1", padding_top: 16, padding_bottom: 16 },
        blocks: [
          {
            type: "column",
            sections: [
              {
                type: "band",
                text: {
                  headline: `${K}.about.intro_title`,
                  body: `${K}.about.intro_body`,
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
                text: { body_md: `${K}.about.intro_aside` },
              },
            ],
          },
        ],
      },
      {
        type: "feature-grid",
        text: { heading: `${K}.about.values_heading` },
        raw: { columns: 3, show_icons: true },
        blocks: [
          {
            type: "feature",
            text: {
              title: `${K}.about.v1_title`,
              body: `${K}.about.v1_body`,
            },
            raw: { icon: "Sparkles" },
          },
          {
            type: "feature",
            text: {
              title: `${K}.about.v2_title`,
              body: `${K}.about.v2_body`,
            },
            raw: { icon: "Users" },
          },
          {
            type: "feature",
            text: {
              title: `${K}.about.v3_title`,
              body: `${K}.about.v3_body`,
            },
            raw: { icon: "Shield" },
          },
        ],
      },
    ],
  },

  {
    key: "contact",
    label: `${K}.contact.label`,
    kind: "page",
    slug: "contact",
    titleKey: `${K}.contact.title`,
    descriptionKey: `${K}.contact.description`,
    sections: [
      {
        type: "hero",
        text: {
          headline: `${K}.contact.hero_headline`,
          subhead: `${K}.contact.hero_subhead`,
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
              title: `${K}.contact.c1_title`,
              body: `${K}.contact.c1_body`,
            },
            raw: { href: "mailto:hello@example.com" },
          },
          {
            type: "card",
            text: {
              title: `${K}.contact.c2_title`,
              body: `${K}.contact.c2_body`,
            },
          },
          {
            type: "card",
            text: {
              title: `${K}.contact.c3_title`,
              body: `${K}.contact.c3_body`,
            },
          },
        ],
      },
      {
        type: "faq",
        text: { heading: `${K}.contact.faq_heading` },
        blocks: [
          {
            type: "qa",
            text: {
              question: `${K}.contact.faq1_q`,
              answer: `${K}.contact.faq1_a`,
            },
          },
        ],
      },
    ],
  },
];

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

function buildPresetSection(spec: PresetSection, t: PresetTranslateFn): SiteSection {
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
  return {
    ...base,
    settings: parseSettingValues(getSectionDefinition(spec.type).settings, {
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
