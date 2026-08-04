
import {
  buildPresetSections,
  findPagePreset,
  type PagePreset,
  type PresetTranslateFn,
} from "./page-presets.js";
import {
  createBlock,
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteSection,
} from "./section-schema.js";
import { SITE, SITE_FOOTER_GROUPS } from "./site.js";

import type { UpdateMarketingSiteBody } from "./site-cms.js";
import type { ThemeSettings } from "./theme-sections.js";
import type { AppLocale } from "@be-water/shared";

export interface SiteStarter {
  key: string;
  /** i18n key（`marketing` namespace） */
  label: string;
  description: string;
}

export interface SiteStarterPageSpec {
  presetKey: string;
  sort_order: number;
}

export interface SiteStarterPayload {
  site: UpdateMarketingSiteBody;
  pages: Array<{
    preset: PagePreset;
    sections: SiteSection[];
    sort_order: number;
  }>;
}

export const SITE_STARTERS: SiteStarter[] = [
  {
    key: "default",
    label: "starter.default.label",
    description: "starter.default.description",
  },
];

/** 默认营销站起步模板包含的页面（主语言）。 */
export const DEFAULT_SITE_STARTER_PAGES: SiteStarterPageSpec[] = [
  { presetKey: "home", sort_order: 0 },
  { presetKey: "docs", sort_order: 10 },
  { presetKey: "pricing", sort_order: 100 },
];

function footerBlocks(): ReturnType<typeof createBlock>[] {
  return SITE_FOOTER_GROUPS.flatMap((group) =>
    group.links.map((link) =>
      createBlock("footer", "footer_link", {
        group: group.label,
        label: link.label,
        href: link.href,
      }),
    ),
  );
}

/** 默认官网风格的页头 / 页脚 + 主题 token。 */
export function buildSiteStarterChrome(
  t: PresetTranslateFn,
): Pick<UpdateMarketingSiteBody, "header" | "footer" | "theme_settings"> {
  const header = createSection("header");
  const footer = createSection("footer");
  const year = new Date().getFullYear();

  return {
    theme_settings: {
      primary_color: "#0369a1",
      font_family: "system",
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
          // 一级页（docs / pricing）由 `show_site_nav` 自动进顶栏，不必再抄一份 nav_link。
          show_site_nav: true,
          layout: "split",
          secondary_label: t("starter.default.login"),
          secondary_href: "/login",
          primary_label: t("starter.default.cta"),
          primary_href: "/register",
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
          blurb: `${SITE.tagline} — ${SITE.description}`,
          copyright: `© ${year} ${SITE.name}`,
        }),
        blocks: footerBlocks(),
      },
    ],
  };
}

export function buildSiteStarter(
  key: string,
  t: PresetTranslateFn,
  _defaultLocale: AppLocale,
  pageSpecs: SiteStarterPageSpec[] = DEFAULT_SITE_STARTER_PAGES,
): SiteStarterPayload | null {
  if (key !== "default") return null;
  const chrome = buildSiteStarterChrome(t);
  const pages: SiteStarterPayload["pages"] = [];

  for (const spec of pageSpecs) {
    const preset = findPagePreset(spec.presetKey);
    if (!preset) continue;
    pages.push({
      preset,
      sections: buildPresetSections(preset, t),
      sort_order: spec.sort_order,
    });
  }

  if (pages.length === 0) return null;

  return { site: chrome, pages };
}

export function findSiteStarter(key: string): SiteStarter | undefined {
  return SITE_STARTERS.find((starter) => starter.key === key);
}
