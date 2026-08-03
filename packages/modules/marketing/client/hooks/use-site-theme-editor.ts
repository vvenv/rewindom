import { useEffect, useState } from "react";

import {
  addSection,
  moveSection,
  removeSection,
  updateSectionSettings,
} from "../lib/section-schema.js";
import { useSite, useSiteMutations, useSitePage } from "./useSite.js";

import {
  mergeThemeDraft,
  type SectionType,
  type SiteSection,
  type ThemeSettings,
} from "../../shared/theme-sections.js";
import type {
  MarketingPage,
  PublicMarketingSite,
} from "../../shared/site-cms.js";
import { marketingPagePath } from "../../shared/site-cms.js";

export function useSiteThemeEditor(pageId: string | undefined) {
  const siteQuery = useSite();
  const pageQuery = useSitePage(pageId);
  const mutations = useSiteMutations();

  const [sections, setSections] = useState<SiteSection[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [themeDraft, setThemeDraft] = useState<ThemeSettings>({});
  const [panel, setPanel] = useState<"section" | "theme">("section");
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!pageQuery.data || !siteQuery.data) return;
    const key = `${pageQuery.data.id}:${pageQuery.data.updated_at}:${siteQuery.data.updated_at}`;
    if (hydratedKey === key) return;
    setSections(pageQuery.data.sections);
    setTitle(pageQuery.data.title);
    setDescription(pageQuery.data.description);
    setThemeDraft(siteQuery.data.theme_settings);
    setSelectedSectionId(pageQuery.data.sections[0]?.id ?? null);
    setHydratedKey(key);
  }, [pageQuery.data, siteQuery.data, hydratedKey]);

  const page: MarketingPage | undefined = pageQuery.data;
  const path = page ? marketingPagePath(page.kind, page.slug) : "/";

  const previewTheme = siteQuery.data
    ? mergeThemeDraft(siteQuery.data.theme_settings, themeDraft)
    : null;

  const previewSite: PublicMarketingSite | null =
    siteQuery.data && previewTheme
      ? {
          site_name: siteQuery.data.site_name,
          tagline: siteQuery.data.tagline,
          logo_url: previewTheme.logo_url ?? null,
          primary_color: previewTheme.primary_color ?? null,
          theme_settings: previewTheme,
          default_locale: siteQuery.data.default_locale,
          nav: siteQuery.data.nav,
          footer: siteQuery.data.footer,
          pages: page
            ? [
                {
                  slug: page.slug,
                  locale: page.locale,
                  kind: page.kind,
                  title,
                  description,
                  path,
                },
              ]
            : [],
        }
      : null;

  const selectedSection =
    sections.find((s) => s.id === selectedSectionId) ?? null;

  return {
    siteQuery,
    pageQuery,
    page,
    path,
    sections,
    title,
    setTitle,
    description,
    setDescription,
    selectedSectionId,
    setSelectedSectionId,
    selectedSection,
    themeDraft,
    setThemeDraft,
    panel,
    setPanel,
    previewSite,
    mutations,
    moveUp: (index: number) => setSections((s) => moveSection(s, index, -1)),
    moveDown: (index: number) => setSections((s) => moveSection(s, index, 1)),
    remove: (sectionId: string) => {
      setSections((s) => removeSection(s, sectionId));
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null);
      }
    },
    add: (type: SectionType) => {
      setSections((s) => {
        const next = addSection(s, type);
        setSelectedSectionId(next[next.length - 1]?.id ?? null);
        setPanel("section");
        return next;
      });
    },
    updateSettings: (
      sectionId: string,
      settings: SiteSection["settings"],
    ): void => {
      setSections((s) => updateSectionSettings(s, sectionId, settings));
    },
  };
}
