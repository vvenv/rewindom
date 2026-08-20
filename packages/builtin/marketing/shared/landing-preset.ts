/**
 * 可套用的落地首页：首屏分栏 + 卖点网格 + 步骤 + 图文分栏 + CTA。
 *
 * 库存文案走 `storefront.landing.*`（`ns:key`），复制到另一语言时换成目标语言句。
 * 空白首页仍是默认；租户在站点设置里显式选这一套。
 */

import { HOME_PAGE_KIND } from "./page-templates.js";

import type { PagePreset } from "./page-presets.types.js";

export const LANDING_HOME_LAYOUT_KEY = "marketing.landing";

export const LANDING_HOME_PRESET: PagePreset = {
  key: "landing",
  label: "marketing:preset.landing.layoutLabel",
  kind: HOME_PAGE_KIND,
  slug: "home",
  titleKey: "marketing:preset.landing.title",
  descriptionKey: "marketing:preset.landing.description",
  sections: [
    {
      type: "hero",
      text: {
        eyebrow: "marketing:storefront.landing.hero.eyebrow",
        headline: "marketing:storefront.landing.hero.headline",
        subhead: "marketing:storefront.landing.hero.subhead",
        primary_label: "marketing:storefront.landing.hero.primary_label",
      },
      raw: {
        primary_href: "/",
        layout: "split",
        show_glow: true,
        align: "left",
      },
      blocks: [
        {
          type: "stat",
          text: {
            term: "marketing:storefront.landing.hero.stat1.term",
            detail: "marketing:storefront.landing.hero.stat1.detail",
          },
        },
        {
          type: "stat",
          text: {
            term: "marketing:storefront.landing.hero.stat2.term",
            detail: "marketing:storefront.landing.hero.stat2.detail",
          },
        },
        {
          type: "stat",
          text: {
            term: "marketing:storefront.landing.hero.stat3.term",
            detail: "marketing:storefront.landing.hero.stat3.detail",
          },
        },
      ],
    },
    {
      type: "feature-grid",
      text: {
        heading: "marketing:storefront.landing.features.heading",
      },
      raw: {
        columns: 3,
        card_style: "bordered",
        show_icons: true,
      },
      blocks: [
        {
          type: "feature",
          raw: { icon: "Sparkles" },
          text: {
            title: "marketing:storefront.landing.features.item1.title",
            body: "marketing:storefront.landing.features.item1.body",
          },
        },
        {
          type: "feature",
          raw: { icon: "Layers" },
          text: {
            title: "marketing:storefront.landing.features.item2.title",
            body: "marketing:storefront.landing.features.item2.body",
          },
        },
        {
          type: "feature",
          raw: { icon: "Rocket" },
          text: {
            title: "marketing:storefront.landing.features.item3.title",
            body: "marketing:storefront.landing.features.item3.body",
          },
        },
      ],
    },
    {
      type: "steps",
      text: {
        heading: "marketing:storefront.landing.steps.heading",
      },
      raw: { show_number: true },
      blocks: [
        {
          type: "step",
          text: {
            title: "marketing:storefront.landing.steps.item1.title",
            body: "marketing:storefront.landing.steps.item1.body",
          },
        },
        {
          type: "step",
          text: {
            title: "marketing:storefront.landing.steps.item2.title",
            body: "marketing:storefront.landing.steps.item2.body",
          },
        },
        {
          type: "step",
          text: {
            title: "marketing:storefront.landing.steps.item3.title",
            body: "marketing:storefront.landing.steps.item3.body",
          },
        },
      ],
    },
    {
      type: "split",
      text: {
        heading: "marketing:storefront.landing.split.heading",
        body: "marketing:storefront.landing.split.body",
        panel_md: "marketing:storefront.landing.split.panel",
        primary_label: "marketing:storefront.landing.split.primary_label",
      },
      raw: {
        primary_href: "/",
        media_side: "right",
      },
    },
    {
      type: "band",
      text: {
        headline: "marketing:storefront.landing.band.headline",
        body: "marketing:storefront.landing.band.body",
        primary_label: "marketing:storefront.landing.band.primary_label",
      },
      raw: {
        primary_href: "/",
        align: "center",
      },
    },
  ],
};
