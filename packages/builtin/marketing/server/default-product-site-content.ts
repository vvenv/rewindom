/**
 * 默认租户（产品主域）官网的**最终** CMS 内容。
 *
 * 与通用起步模板（`site-starters` / `page-presets` 的占位文案）分开：那些是给任意
 * 租户开局用的；这里是 be-water 自己的产品站，文案来自 `client/locales` 里历史落地页
 * 那一套（`site` / `hero` / `features` / `landing` / `pricing` / `seo`）。
 */

import type { AppLocale } from "@be-water/shared";

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };
import {
  createBlock,
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteSection,
} from "../shared/section-schema.js";
import type { LocalizedText, SettingValues } from "../shared/section-settings.js";
import type { UpdateMarketingSiteBody } from "../shared/site-cms.js";
import { createNavItemId, type SiteNavItem } from "../shared/site-nav.js";
import { findSiteTheme } from "../shared/site-themes.js";
import type { ThemeSettings } from "../shared/theme-sections.js";

type LocaleMessages = typeof zhCN;

const MESSAGES: Record<AppLocale, LocaleMessages> = {
  "zh-CN": zhCN,
  en: en as LocaleMessages,
};

/** 产品站对外公开的语言（与 usage docs / 落地页文案对齐）。 */
export const PRODUCT_SITE_LOCALES: readonly AppLocale[] = ["zh-CN", "en"];

const FEATURE_ICONS = [
  "Bot",
  "Layers",
  "Blocks",
  "Plug",
  "Shield",
  "Server",
] as const;

const FEATURE_KEYS = [
  "bot",
  "layers",
  "blocks",
  "plug",
  "shield",
  "server",
] as const;

const PLAN_SLUGS = [
  "free",
  "starter",
  "pro",
  "business",
  "enterprise",
] as const;

/** 与 `packages/builtin/platform/shared/pricing-plans.ts` 对齐的月价展示。 */
const PLAN_PRICES: Record<(typeof PLAN_SLUGS)[number], number | null> = {
  free: 0,
  starter: 99,
  pro: 399,
  business: 999,
  enterprise: null,
};

const TECH_STACK_ROWS: ReadonlyArray<{ layer: keyof LocaleMessages["techStack"]["layerLabels"]; detail: string }> =
  [
    { layer: "backend", detail: "Fastify 5 · TypeScript 6 · Prisma 7" },
    { layer: "data", detail: "PostgreSQL 16 · Redis" },
    { layer: "frontend", detail: "React 19 · Vite 8 · React Router" },
    { layer: "ui", detail: "shadcn/ui · Tailwind CSS 4" },
    { layer: "deploy", detail: "Docker Compose" },
  ];

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

function tList(locale: AppLocale, path: string): string[] {
  const parts = path.split(".");
  let current: unknown = MESSAGES[locale];
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return [];
    }
    current = (current as Record<string, unknown>)[part];
  }
  return Array.isArray(current)
    ? current.filter((item): item is string => typeof item === "string")
    : [];
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
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
  const base = createSection(type);
  return {
    ...base,
    settings: parseSettingValues(getSectionDefinition(type).settings, {
      ...base.settings,
      ...values,
    }),
    blocks,
  };
}

function navLink(label: LocalizedText | string, href: string): SiteNavItem {
  return {
    id: createNavItemId(),
    source: "link",
    label,
    href,
    category: "",
    expand: "children",
    children: [],
  };
}

function buildChrome(): Pick<
  UpdateMarketingSiteBody,
  "header" | "footer" | "theme_settings" | "site_name" | "tagline"
> {
  const year = new Date().getFullYear();
  const header = createSection("header");
  const footer = createSection("footer");

  const headerItems: SiteNavItem[] = [
    {
      id: createNavItemId(),
      source: "pages",
      label: "",
      href: "",
      category: "",
      expand: "flat",
      children: [],
    },
    {
      id: createNavItemId(),
      source: "docs",
      label: "",
      href: "",
      category: "",
      expand: "children",
      children: [],
    },
  ];

  const productColumn = createBlock("footer", "menu_column", {
    title: i18nLiteral({ "zh-CN": "产品", en: "Product" }),
    items: [
      navLink(i18nLiteral({ "zh-CN": "首页", en: "Home" }), "/"),
      navLink(i18n("nav.pricing"), "/pricing"),
    ],
  });
  const docsColumn = createBlock("footer", "menu_column", {
    title: i18n("nav.docs"),
    items: [
      navLink(i18n("nav.docs"), "/docs"),
      navLink(
        i18nLiteral({ "zh-CN": "快速入门", en: "Getting started" }),
        "/docs/getting-started",
      ),
    ],
  });

  return {
    site_name: i18nLiteral({ "zh-CN": "be-water", en: "be-water" }),
    tagline: i18n("site.tagline"),
    theme_settings: {
      ...findSiteTheme("default")!.theme_settings,
      logo_url: null,
    } satisfies ThemeSettings,
    header: [
      {
        ...header,
        settings: parseSettingValues(getSectionDefinition("header").settings, {
          ...header.settings,
          show_logo: true,
          show_site_name: true,
          sticky: true,
          layout: "split",
          items: headerItems,
          show_locale_switcher: true,
          show_doc_search: true,
          show_theme_toggle: true,
          show_account: true,
          primary_label: i18n("header.getStarted"),
          primary_href: "/docs/getting-started",
        }),
        blocks: [],
      },
    ],
    footer: [
      {
        ...footer,
        settings: parseSettingValues(getSectionDefinition("footer").settings, {
          ...footer.settings,
          show_logo: true,
          blurb: i18n("site.description"),
          copyright: i18nLiteral({
            "zh-CN": `© ${year} be-water`,
            en: `© ${year} be-water`,
          }),
        }),
        blocks: [productColumn, docsColumn],
      },
    ],
  };
}

function buildHomeSections(locale: AppLocale): SiteSection[] {
  const infraCount = String(Object.keys(MESSAGES[locale].builtinModules).length);

  const heroStats = (
    ["agentLoop", "infraModules", "tenantIsolation"] as const
  ).map((key) => {
    const detailTemplate = t(locale, `hero.stats.${key}.detail`);
    return createBlock("hero", "stat", {
      term: t(locale, `hero.stats.${key}.term`),
      detail: interpolate(detailTemplate, { count: infraCount }),
    });
  });

  const features = FEATURE_KEYS.map((key, index) =>
    createBlock("feature-grid", "feature", {
      title: t(locale, `features.${key}.title`),
      body: t(locale, `features.${key}.description`),
      icon: FEATURE_ICONS[index]!,
    }),
  );

  const steps = (["spec", "gen", "check"] as const).map((key) =>
    createBlock("steps", "step", {
      title: t(locale, `landing.agentFirst.steps.${key}.title`),
      body: t(locale, `landing.agentFirst.steps.${key}.description`),
    }),
  );

  const moduleCards = (
    Object.keys(MESSAGES[locale].builtinModules) as Array<
      keyof LocaleMessages["builtinModules"]
    >
  ).map((key) =>
    createBlock("cards", "card", {
      // locales 里每个模块只有一句说明，直接做卡片标题
      title: t(locale, `builtinModules.${key}`),
      body: "",
    }),
  );

  const techRows = TECH_STACK_ROWS.map((row) =>
    createBlock("spec-list", "row", {
      term: t(locale, `techStack.layerLabels.${row.layer}`),
      detail: row.detail,
    }),
  );

  return [
    section(
      "hero",
      {
        headline: t(locale, "hero.headline"),
        subhead: t(locale, "hero.subline"),
        primary_label: t(locale, "hero.primaryCta"),
        primary_href: "/docs/getting-started",
        secondary_label: t(locale, "hero.secondaryCta"),
        secondary_href: "/docs/modular-architecture",
        align: "left",
        show_glow: true,
      },
      heroStats,
    ),
    section(
      "feature-grid",
      {
        // 六项能力本身带标题，不再叠一段与 hero 重复的抬头
        heading: "",
        subheading: "",
        columns: 3,
        show_icons: true,
      },
      features,
    ),
    section(
      "steps",
      {
        heading: t(locale, "landing.agentFirst.title"),
        subheading: t(locale, "landing.agentFirst.description"),
        primary_label: t(locale, "landing.agentFirst.readMore"),
        primary_href: "/docs/modular-architecture",
        columns: 3,
        show_number: true,
        anchor: "agent-first",
      },
      steps,
    ),
    section(
      "cards",
      {
        heading: t(locale, "landing.builtinModules.title"),
        subheading: t(locale, "landing.builtinModules.description"),
        columns: 4,
        card_style: "bordered",
      },
      moduleCards,
    ),
    section(
      "spec-list",
      {
        heading: t(locale, "landing.techStack.title"),
        subheading: t(locale, "landing.techStack.description"),
        primary_label: t(locale, "landing.techStack.readDocs"),
        primary_href: "/docs",
        layout: "split",
      },
      techRows,
    ),
    section("band", {
      headline: t(locale, "landing.closingCta.title"),
      body: t(locale, "landing.closingCta.description"),
      primary_label: t(locale, "landing.closingCta.getStarted"),
      primary_href: "/docs/getting-started",
      secondary_label: t(locale, "landing.closingCta.viewPricing"),
      secondary_href: "/pricing",
      align: "center",
      background: "muted",
      anchor: "get-started",
    }),
  ];
}

function formatPlanPrice(locale: AppLocale, slug: (typeof PLAN_SLUGS)[number]): string {
  const amount = PLAN_PRICES[slug];
  if (amount === null) return t(locale, "pricing.priceCustom");
  if (amount === 0) return t(locale, "pricing.priceFree");
  return interpolate(t(locale, "pricing.priceAmount"), {
    price: String(amount),
  });
}

function buildPricingSections(locale: AppLocale): SiteSection[] {
  const plans = PLAN_SLUGS.map((slug) => {
    const highlights = tList(locale, `pricing.plans.${slug}.highlights`).join(
      "\n",
    );
    return createBlock("pricing", "plan", {
      name: t(locale, `pricing.platformPlans.${slug}.name`),
      audience: t(locale, `pricing.plans.${slug}.audience`),
      price: formatPlanPrice(locale, slug),
      price_note: slug === "enterprise" || slug === "free" ? "" : t(locale, "pricing.perMonth"),
      highlights,
      featured: slug === "pro",
      primary_label: t(locale, `pricing.plans.${slug}.cta`),
      primary_href:
        slug === "enterprise" ? "/docs/installation" : "/docs/getting-started",
    });
  });

  const faqItems = (
    MESSAGES[locale].pricing.faq.items as Array<{
      question: string;
      answer: string;
    }>
  ).map((item) =>
    createBlock("faq", "qa", {
      question: item.question,
      answer: item.answer,
    }),
  );

  return [
    section(
      "pricing",
      {
        heading: t(locale, "pricing.pageTitle"),
        subheading: t(locale, "pricing.pageDescription"),
        footnote: t(locale, "pricing.footnote"),
        featured_badge: t(locale, "pricing.recommended"),
        columns: 3,
      },
      plans,
    ),
    section("faq", { heading: t(locale, "pricing.faqTitle") }, faqItems),
  ];
}

/** 组装默认租户产品站：中英双语页面 + 带 `__i18n` 的页头页脚。 */
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
    pages.push({
      kind: "page",
      slug: "pricing",
      locale,
      title: t(locale, "seo.pricing.title"),
      description: t(locale, "seo.pricing.description"),
      sections: buildPricingSections(locale),
      sort_order: 1,
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
