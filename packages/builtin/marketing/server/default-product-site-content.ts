/**
 * 默认租户（产品主域）官网的**最终** CMS 内容。
 *
 * 与通用起步模板（`site-starters` / `page-presets` 的占位文案）分开：那些是给任意
 * 租户开局用的；这里是 Rewindom 自己的产品站，文案来自 `client/locales` 里
 * `site` / `hero` / `features` / `landing` / `seo`。
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

const CONTRAST_KEYS = ["scaffold", "micro", "lowcode"] as const;
const SHIPPED_KEYS = ["site", "platform", "operate"] as const;
const AGENT_FIRST_STEP_KEYS = ["spec", "gen", "check"] as const;

const YESTINO_HREF = "https://yestino.com";
const SHOWCASE_ANCHOR = "showcase";

/**
 * 首页内容区段的上下留白。段与段之间仍走主题 `section_spacing`；
 * schema 默认 padding 为 0，叠在一起会挤成一团。
 */
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

function column(children: SiteSection[]): SiteBlock {
  const block = createBlock("group", "column");
  return { ...block, sections: children };
}

function threeColumnGroup(
  columns: SiteSection[],
  extra: SettingValues = {},
): SiteSection {
  return section(
    "group",
    {
      columns_layout: "4:4:4",
      column_gap: 32,
      align_items: "stretch",
      ...PAGE_SECTION_PADDING,
      ...extra,
    },
    columns.map((child) => column([child])),
  );
}

function buildChrome(): Pick<
  UpdateMarketingSiteBody,
  "header" | "footer" | "theme_settings" | "site_name" | "tagline"
> {
  return {
    site_name: i18nLiteral({ "zh-CN": APP_DISPLAY_NAME, en: APP_DISPLAY_NAME }),
    tagline: i18n("site.tagline"),
    theme_settings: {
      ...findSiteTheme("default")!.theme_settings,
      section_spacing: 32,
      logo_url: null,
    } satisfies ThemeSettings,
    /*
     * 页头页脚都走 definition 默认：页头是 Logo + 站名 + 一级页面导航 + 语言 + 明暗，
     * 页脚是一行 `© {year} {site}`。
     *
     * 版权**不再**在这里烤死成 `© 2026 Rewindom`：文本块的占位符自己会算当年年份与
     * 当前站名，建站那天写死的话跨年之后页脚就一直停在去年。
     */
    header: [createSection("header")],
    footer: [createSection("footer")],
  };
}

function contrastCard(locale: AppLocale, key: (typeof CONTRAST_KEYS)[number]): SiteSection {
  return section("prose", {
    body_md: `### ${t(locale, `features.${key}.title`)}\n\n${t(locale, `features.${key}.description`)}`,
  });
}

function shippedCard(
  locale: AppLocale,
  key: (typeof SHIPPED_KEYS)[number],
): SiteSection {
  return section("prose", {
    body_md: `### ${t(locale, `landing.shipped.${key}.title`)}\n\n${t(locale, `landing.shipped.${key}.body`)}`,
  });
}

function buildAgentFirstMarkdown(locale: AppLocale): string {
  const lines = [
    `## ${t(locale, "landing.agentFirst.title")}`,
    "",
    t(locale, "landing.agentFirst.description"),
    "",
  ];
  AGENT_FIRST_STEP_KEYS.forEach((key, index) => {
    lines.push(
      `${index + 1}. **${t(locale, `landing.agentFirst.steps.${key}.title`)}** — ${t(locale, `landing.agentFirst.steps.${key}.description`)}`,
    );
  });
  lines.push(
    "",
    `[${t(locale, "landing.agentFirst.readMore")}](/docs/modular-architecture)`,
  );
  return lines.join("\n").trim();
}

function buildShippedIntro(locale: AppLocale): string {
  return [
    `## ${t(locale, "landing.shipped.title")}`,
    "",
    t(locale, "landing.shipped.description"),
  ].join("\n");
}

function buildTechStackMarkdown(locale: AppLocale): string {
  return [
    `## ${t(locale, "landing.techStack.title")}`,
    "",
    t(locale, "landing.techStack.description"),
    "",
    `[${t(locale, "landing.techStack.readDocs")}](/docs)`,
  ].join("\n");
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
        secondary_href: `#${SHOWCASE_ANCHOR}`,
        align: "left",
        show_glow: true,
      },
      heroStats,
    ),
    threeColumnGroup(
      CONTRAST_KEYS.map((key) => contrastCard(locale, key)),
    ),
    section("prose", {
      body_md: buildAgentFirstMarkdown(locale),
      anchor: "agent-first",
      ...PAGE_SECTION_PADDING,
    }),
    section("prose", {
      body_md: buildShippedIntro(locale),
      anchor: "shipped",
      padding_top: 48,
      padding_bottom: 16,
    }),
    threeColumnGroup(
      SHIPPED_KEYS.map((key) => shippedCard(locale, key)),
      { padding_top: 0, padding_bottom: 48 },
    ),
    section("band", {
      headline: t(locale, "landing.showcase.title"),
      body: t(locale, "landing.showcase.body"),
      primary_label: t(locale, "landing.showcase.cta"),
      primary_href: YESTINO_HREF,
      align: "left",
      background: "muted",
      anchor: SHOWCASE_ANCHOR,
      spacing_above: 16,
    }),
    section("prose", {
      body_md: buildTechStackMarkdown(locale),
      ...PAGE_SECTION_PADDING,
    }),
    section("band", {
      headline: t(locale, "landing.closingCta.title"),
      body: t(locale, "landing.closingCta.description"),
      primary_label: t(locale, "landing.closingCta.getStarted"),
      primary_href: "/docs/getting-started",
      align: "center",
      background: "muted",
      anchor: "get-started",
      spacing_above: 16,
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
