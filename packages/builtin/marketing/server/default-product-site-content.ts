/**
 * 默认租户（产品主域）官网的**最终** CMS 内容。
 *
 * 与通用起步模板（`site-starters` / `page-presets` 的占位文案）分开：那些是给任意
 * 租户开局用的；这里是 Rewindom 自己的产品站，文案来自 `client/locales` 里
 * `site` / `hero` / `features` / `landing` / `seo`。
 *
 * 首页用视觉积木（hero 分栏、feature-grid、steps、split、band），不用 Markdown 卡片堆。
 */

import { APP_DISPLAY_NAME, type AppLocale } from "@rewindom/shared";

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };
import {
  createBlock,
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteBlock,
  type SiteSection,
} from "../shared/section-schema.js";
import { findSiteTheme } from "../shared/site-themes.js";

import type {
  LocalizedText,
  SectionIconName,
  SettingValues,
} from "../shared/section-settings.js";
import type { UpdateMarketingSiteBody } from "../shared/site-cms.js";
import type { ThemeSettings } from "../shared/theme-sections.js";

type LocaleMessages = typeof zhCN;

const MESSAGES: Record<AppLocale, LocaleMessages> = {
  "zh-CN": zhCN,
  en: en as LocaleMessages,
};

/** 产品站对外公开的语言（与 usage docs / 落地页文案对齐）。 */
export const PRODUCT_SITE_LOCALES: readonly AppLocale[] = ["zh-CN", "en"];

const CONTRAST_ITEMS: ReadonlyArray<{
  key: "scaffold" | "micro" | "lowcode";
  icon: SectionIconName;
}> = [
  { key: "scaffold", icon: "Blocks" },
  { key: "micro", icon: "Server" },
  { key: "lowcode", icon: "Puzzle" },
];

const SHIPPED_ITEMS: ReadonlyArray<{
  key: "site" | "platform" | "operate";
  icon: SectionIconName;
}> = [
  { key: "site", icon: "Globe" },
  { key: "platform", icon: "Shield" },
  { key: "operate", icon: "LineChart" },
];

const AGENT_FIRST_STEPS = ["spec", "gen", "check"] as const;

const YESTINO_HREF = "https://yestino.com";
const GITHUB_HREF = "https://github.com/vvenv/rewindom";
const SHOWCASE_ANCHOR = "showcase";

const PAGE_SECTION_PADDING = {
  padding_top: 48,
  padding_bottom: 48,
} as const;

export interface ProductSitePageWrite {
  kind: "home" | "page";
  slug: string;
  locale: AppLocale;
  title: string;
  description: string;
  sections: SiteSection[];
  sort_order: number;
}

export interface ProductSitePayload {
  site: UpdateMarketingSiteBody;
  pages: ProductSitePageWrite[];
}

function t(locale: AppLocale, path: string): string {
  const parts = path.split(".");
  let current: unknown = MESSAGES[locale];
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return path;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

function i18n(path: string): LocalizedText {
  const table: Record<string, string> = {};
  for (const locale of PRODUCT_SITE_LOCALES) {
    table[locale] = t(locale, path);
  }
  return { __i18n: table };
}

function i18nLiteral(values: Record<AppLocale, string>): LocalizedText {
  return { __i18n: { ...values } };
}

function section(
  type: string,
  values: SettingValues,
  blocks: SiteSection["blocks"] = [],
): SiteSection {
  const definition = getSectionDefinition(type);
  if (!definition) {
    throw new Error(`Unknown section type: ${type}`);
  }
  const base = createSection(type);
  return {
    ...base,
    settings: parseSettingValues(definition.settings, {
      ...base.settings,
      ...values,
    }),
    blocks,
  };
}

function githubButton(
  area: "header" | "footer",
  extra: SettingValues = {},
): SiteBlock {
  return createBlock(area, "chrome_button", {
    label: i18n("header.github"),
    href: GITHUB_HREF,
    variant: "ghost",
    align: "end",
    mobile: "menu",
    ...extra,
  });
}

function buildChrome(): Pick<
  UpdateMarketingSiteBody,
  "header" | "footer" | "theme_settings" | "site_name" | "tagline"
> {
  const header = createSection("header");
  const footer = createSection("footer");
  return {
    site_name: i18nLiteral({ "zh-CN": APP_DISPLAY_NAME, en: APP_DISPLAY_NAME }),
    tagline: i18n("site.tagline"),
    theme_settings: {
      ...findSiteTheme("default")!.theme_settings,
      font_family: "inter",
      page_width: "wide",
      section_spacing: 40,
      logo_url: null,
    } satisfies ThemeSettings,
    header: [
      {
        ...header,
        blocks: [...header.blocks, githubButton("header")],
      },
    ],
    footer: [
      {
        ...footer,
        blocks: [...footer.blocks, githubButton("footer", { mobile: "pin" })],
      },
    ],
  };
}

function buildHomeSections(locale: AppLocale): SiteSection[] {
  const heroStats = (["local", "shipped", "deploy"] as const).map((key) =>
    createBlock("hero", "stat", {
      term: t(locale, `hero.stats.${key}.term`),
      detail: t(locale, `hero.stats.${key}.detail`),
    }),
  );

  return [
    section(
      "hero",
      {
        eyebrow: t(locale, "hero.eyebrow"),
        headline: t(locale, "hero.headline"),
        subhead: t(locale, "hero.subline"),
        primary_label: t(locale, "hero.primaryCta"),
        primary_href: "/docs/getting-started",
        secondary_label: t(locale, "hero.secondaryCta"),
        secondary_href: GITHUB_HREF,
        align: "left",
        layout: "split",
        show_glow: true,
      },
      heroStats,
    ),
    section(
      "feature-grid",
      {
        heading: t(locale, "features.heading"),
        columns: 3,
        card_style: "bordered",
        show_icons: true,
        ...PAGE_SECTION_PADDING,
      },
      CONTRAST_ITEMS.map((item) =>
        createBlock("feature-grid", "feature", {
          icon: item.icon,
          title: t(locale, `features.${item.key}.title`),
          body: t(locale, `features.${item.key}.description`),
        }),
      ),
    ),
    section(
      "steps",
      {
        heading: t(locale, "landing.agentFirst.title"),
        subheading: t(locale, "landing.agentFirst.description"),
        show_number: true,
        anchor: "agent-first",
        ...PAGE_SECTION_PADDING,
      },
      AGENT_FIRST_STEPS.map((key) =>
        createBlock("steps", "step", {
          title: t(locale, `landing.agentFirst.steps.${key}.title`),
          body: t(locale, `landing.agentFirst.steps.${key}.description`),
        }),
      ),
    ),
    section(
      "feature-grid",
      {
        heading: t(locale, "landing.shipped.title"),
        subheading: t(locale, "landing.shipped.description"),
        columns: 3,
        card_style: "bordered",
        show_icons: true,
        anchor: "shipped",
        ...PAGE_SECTION_PADDING,
      },
      SHIPPED_ITEMS.map((item) =>
        createBlock("feature-grid", "feature", {
          icon: item.icon,
          title: t(locale, `landing.shipped.${item.key}.title`),
          body: t(locale, `landing.shipped.${item.key}.body`),
        }),
      ),
    ),
    section("split", {
      heading: t(locale, "landing.showcase.title"),
      body: t(locale, "landing.showcase.body"),
      panel_md: `### ${t(locale, "landing.showcase.panelTitle")}\n\n${t(locale, "landing.showcase.panelBody")}`,
      primary_label: t(locale, "landing.showcase.cta"),
      primary_href: YESTINO_HREF,
      media_side: "right",
      anchor: SHOWCASE_ANCHOR,
      ...PAGE_SECTION_PADDING,
    }),
    section("band", {
      headline: t(locale, "landing.closingCta.title"),
      body: t(locale, "landing.closingCta.description"),
      primary_label: t(locale, "landing.closingCta.getStarted"),
      primary_href: "/docs/getting-started",
      secondary_label: t(locale, "landing.closingCta.github"),
      secondary_href: GITHUB_HREF,
      align: "center",
      background: "muted",
      anchor: "get-started",
    }),
  ];
}

/** 组装默认租户产品站：中英双语首页 + 带 `__i18n` 的页头页脚。 */
export function buildDefaultProductSite(): ProductSitePayload {
  const chrome = buildChrome();
  const pages: ProductSitePageWrite[] = [];

  for (const locale of PRODUCT_SITE_LOCALES) {
    pages.push({
      kind: "home",
      slug: "home",
      locale,
      title: t(locale, "seo.home.title"),
      description: t(locale, "seo.home.description"),
      sections: buildHomeSections(locale),
      sort_order: 0,
    });
  }

  return {
    site: {
      ...chrome,
      default_locale: "zh-CN",
      published: true,
    },
    pages,
  };
}

/** 占位 starter 的站名——用来判断默认租户是否还停在通用模板上。 */
export function isGenericStarterSiteName(siteName: string): boolean {
  const trimmed = siteName.trim();
  return (
    trimmed === t("zh-CN", "starter.default.site_name") ||
    trimmed === t("en", "starter.default.site_name")
  );
}
