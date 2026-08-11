import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { useTenantBranding } from "@be-water/client-kit";
import { normalizeLocale, type AppLocale } from "@be-water/shared";

import { isTemplatePageKind } from "../../shared/page-templates.js";
import {
  createSection,
  localizeSections,
  localizeSiteText,
  type SectionType,
  type SettingValues,
  type SiteSection,
} from "../../shared/section-schema.js";
import {
  marketingPagePath,
  type PageLocaleAlternate,
  type PublicMarketingSite,
} from "../../shared/site-cms.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";
import {
  addBlock,
  findSection,
  moveBlock,
  moveSection,
  moveSectionTo,
  removeBlock,
  removeSection,
  reorderBlock,
  updateBlockSettings,
  updateSectionSettings,
  type DropPlace,
  type SectionDropTarget,
} from "../lib/section-schema.js";

import {
  useSite,
  useSiteCapabilities,
  useSiteMutations,
  useSitePages,
} from "./useSite.js";

import type { AddSectionTarget, EditorArea } from "./use-site-theme-editor.js";

export type ChromeEditorSelection = {
  kind: "section";
  sectionId: string;
  blockId: string | null;
};

function normalizeChrome(header: SiteSection[], footer: SiteSection[]) {
  return {
    header: header.length > 0 ? header : [createSection("header")],
    footer: footer.length > 0 ? footer : [createSection("footer")],
  };
}

function chromeSnapshot(header: SiteSection[], footer: SiteSection[]): string {
  return JSON.stringify([header, footer]);
}

export function useSiteChromeEditor() {
  const siteQuery = useSite();
  const pagesQuery = useSitePages();
  const capabilitiesQuery = useSiteCapabilities();
  const mutations = useSiteMutations();
  const brandingQuery = useTenantBranding();

  const [header, setHeader] = useState<SiteSection[]>([]);
  const [footer, setFooter] = useState<SiteSection[]>([]);
  const [selection, setSelection] = useState<ChromeEditorSelection | null>(
    null,
  );
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);

  const defaultLocale: AppLocale = normalizeLocale(
    siteQuery.data?.default_locale,
  );
  const [locale, setLocale] = useState<AppLocale>(defaultLocale);

  useEffect(() => {
    setLocale(defaultLocale);
  }, [defaultLocale]);

  useEffect(() => {
    if (!siteQuery.data) return;
    const key = siteQuery.data.updated_at;
    if (hydratedKey === key) return;

    const normalized = normalizeChrome(
      siteQuery.data.header,
      siteQuery.data.footer,
    );
    const snapshot = chromeSnapshot(normalized.header, normalized.footer);

    setHeader(normalized.header);
    setFooter(normalized.footer);
    setSelection({
      kind: "section",
      sectionId: normalized.header[0]?.id ?? normalized.footer[0]?.id ?? "",
      blockId: null,
    });
    setBaseline(snapshot);
    setHydratedKey(key);
  }, [siteQuery.data, hydratedKey]);

  const dirty =
    baseline !== null && baseline !== chromeSnapshot(header, footer);

  const pages = pagesQuery.data ?? [];
  const previewNavPages = pages
    .filter((item) => item.status === "published" && item.locale === locale)
    .filter((item) => !isTemplatePageKind(item.kind))
    .map((item) => ({
      slug: item.slug,
      locale: item.locale,
      kind: item.kind,
      title: item.title,
      description: item.description,
      path: marketingPagePath(item.kind, item.slug),
      settings: item.settings,
    }));

  const previewAlternates: PageLocaleAlternate[] = siteLocaleOrder(
    defaultLocale,
  )
    .filter((slug) =>
      pages.some(
        (page) =>
          page.locale === slug &&
          page.status === "published" &&
          page.slug === "home" &&
          page.kind === "home",
      ),
    )
    .map((slug) => ({
      locale: slug,
      path: slug === defaultLocale ? "/" : `/${slug}`,
    }));

  const previewLogoUrl =
    siteQuery.data?.theme_settings.logo_url ??
    brandingQuery.data?.logo_url ??
    null;

  const previewSite: PublicMarketingSite | null = siteQuery.data
    ? {
        site_name: localizeSiteText(
          siteQuery.data.site_name,
          locale,
          defaultLocale,
        ),
        tagline: localizeSiteText(
          siteQuery.data.tagline,
          locale,
          defaultLocale,
        ),
        logo_url: previewLogoUrl,
        primary_color: siteQuery.data.theme_settings.primary_color ?? null,
        theme_settings: {
          ...siteQuery.data.theme_settings,
          logo_url: previewLogoUrl,
        },
        default_locale: defaultLocale,
        locale,
        available_locales: siteLocaleOrder(defaultLocale),
        header: localizeSections(header, locale, defaultLocale),
        footer: localizeSections(footer, locale, defaultLocale),
        pages: previewNavPages,
      }
    : null;

  const selectedSectionId =
    selection?.kind === "section" ? selection.sectionId : null;
  const selectedBlockId =
    selection?.kind === "section" ? selection.blockId : null;

  const areaOf = (sectionId: string | null): EditorArea | null => {
    if (!sectionId) return null;
    if (findSection(header, sectionId)) return "header";
    if (findSection(footer, sectionId)) return "footer";
    return null;
  };

  const selectedSection: SiteSection | null = selectedSectionId
    ? (findSection(header, selectedSectionId) ??
      findSection(footer, selectedSectionId))
    : null;

  const setterFor = (
    area: EditorArea | null,
  ): Dispatch<SetStateAction<SiteSection[]>> =>
    area === "header" ? setHeader : setFooter;

  function mutateSectionOrArea(
    sectionId: string,
    update: (current: SiteSection[]) => SiteSection[],
  ): void {
    setterFor(areaOf(sectionId))(update);
  }

  return {
    siteQuery,
    capabilities: {
      account_entry: capabilitiesQuery.data?.account_entry ?? false,
      entitlements: new Set(capabilitiesQuery.data?.entitlements ?? []),
    },
    header,
    footer,
    selection,
    selectedSectionId,
    selectedSection,
    selectedBlockId,
    previewSite,
    previewAlternates,
    locale,
    setLocale,
    defaultLocale,
    locales: siteLocaleOrder(defaultLocale),
    dirty,
    chromeDirty: siteQuery.data?.chrome_dirty ?? false,
    mutations,
    discardLocalChanges: (): void => {
      setHydratedKey(null);
    },
    selectSection: (sectionId: string, blockId: string | null = null): void => {
      setSelection({ kind: "section", sectionId, blockId });
    },
    moveSection: (sectionId: string, direction: -1 | 1): void => {
      setterFor(areaOf(sectionId))((s) => moveSection(s, sectionId, direction));
    },
    moveSectionTo: (sourceId: string, target: SectionDropTarget): void => {
      setterFor(areaOf(sourceId))((s) => moveSectionTo(s, sourceId, target));
      setSelection({ kind: "section", sectionId: sourceId, blockId: null });
    },
    removeSection: (sectionId: string): void => {
      setterFor(areaOf(sectionId))((s) => removeSection(s, sectionId));
      if (selectedSectionId === sectionId) {
        const nextId = header[0]?.id ?? footer[0]?.id ?? null;
        setSelection(
          nextId
            ? { kind: "section", sectionId: nextId, blockId: null }
            : null,
        );
      }
    },
    addSection: (type: SectionType, target: AddSectionTarget): void => {
      if (target.kind !== "area") return;
      const created = createSection(type);
      setSelection({ kind: "section", sectionId: created.id, blockId: null });
      const setter = target.area === "header" ? setHeader : setFooter;
      setter((current) =>
        target.area === "header" ? [created, ...current] : [...current, created],
      );
    },
    updateSettings: (sectionId: string, settings: SettingValues): void => {
      mutateSectionOrArea(sectionId, (s) =>
        updateSectionSettings(s, sectionId, settings),
      );
    },
    addBlock: (sectionId: string, blockType: string): void => {
      let createdId: string | null = null;
      mutateSectionOrArea(sectionId, (s) => {
        const next = addBlock(s, sectionId, blockType);
        const section = next.find((item) => item.id === sectionId);
        createdId = section?.blocks[section.blocks.length - 1]?.id ?? null;
        return next;
      });
      if (createdId) {
        setSelection({ kind: "section", sectionId, blockId: createdId });
      }
    },
    removeBlock: (sectionId: string, blockId: string): void => {
      mutateSectionOrArea(sectionId, (s) => removeBlock(s, sectionId, blockId));
      if (selectedBlockId === blockId) {
        setSelection({ kind: "section", sectionId, blockId: null });
      }
    },
    moveBlock: (sectionId: string, index: number, direction: -1 | 1): void => {
      mutateSectionOrArea(sectionId, (s) =>
        moveBlock(s, sectionId, index, direction),
      );
    },
    reorderBlock: (
      sectionId: string,
      sourceBlockId: string,
      targetBlockId: string,
      place: DropPlace,
    ): void => {
      mutateSectionOrArea(sectionId, (s) =>
        reorderBlock(s, sectionId, sourceBlockId, targetBlockId, place),
      );
    },
    updateBlockSettings: (
      sectionId: string,
      blockId: string,
      settings: SettingValues,
    ): void => {
      mutateSectionOrArea(sectionId, (s) =>
        updateBlockSettings(s, sectionId, blockId, settings),
      );
    },
  };
}
