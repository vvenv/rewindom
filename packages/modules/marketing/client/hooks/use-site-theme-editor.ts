import { useEffect, useState } from "react";

import { useTenantBranding } from "@be-water/client-kit";

import {
  marketingPagePath,
  type MarketingPage,
  type PublicMarketingSite,
} from "../../shared/site-cms.js";
import {
  addBlock,
  addSection,
  moveBlock,
  moveSection,
  removeBlock,
  removeSection,
  updateBlockSettings,
  updateSectionSettings,
} from "../lib/section-schema.js";

import {
  useSite,
  useSiteMutations,
  useSitePage,
  useSitePages,
} from "./useSite.js";

import type {
  PageSectionType,
  SettingValues,
  SiteSection,
} from "../../shared/section-schema.js";

/** 当前选中项：section 本身（`blockId: null`）或其下某个 block。 */
export interface ThemeEditorSelection {
  sectionId: string;
  blockId: string | null;
}

/** 页头 / 页脚是站点级的：与页面 sections 分开存、分开存盘。 */
export type EditorArea = "header" | "footer";

export function useSiteThemeEditor(pageId: string | undefined) {
  const siteQuery = useSite();
  const pagesQuery = useSitePages();
  const pageQuery = useSitePage(pageId);
  const mutations = useSiteMutations();
  // 官网 logo 默认继承品牌资产。服务端只对**公开**站点做这个回落，管理端那份保持原样
  // （它要灌进设置表单，填进去一存就把继承关系写死了），所以预览在这里自己兜。
  const brandingQuery = useTenantBranding();

  const [sections, setSections] = useState<SiteSection[]>([]);
  const [header, setHeader] = useState<SiteSection | null>(null);
  const [footer, setFooter] = useState<SiteSection | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selection, setSelection] = useState<ThemeEditorSelection | null>(null);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!pageQuery.data || !siteQuery.data) return;
    const key = `${pageQuery.data.id}:${pageQuery.data.updated_at}:${siteQuery.data.updated_at}`;
    if (hydratedKey === key) return;
    setSections(pageQuery.data.sections);
    setHeader(siteQuery.data.header);
    setFooter(siteQuery.data.footer);
    setTitle(pageQuery.data.title);
    setDescription(pageQuery.data.description);
    const firstId = pageQuery.data.sections[0]?.id ?? null;
    setSelection(firstId ? { sectionId: firstId, blockId: null } : null);
    setHydratedKey(key);
  }, [pageQuery.data, siteQuery.data, hydratedKey]);

  const page: MarketingPage | undefined = pageQuery.data;
  const path = page ? marketingPagePath(page.kind, page.slug) : "/";

  // 主题设置已并入「系统管理 → 品牌」，编辑器只读取它做预览。
  const previewLogoUrl =
    siteQuery.data?.theme_settings.logo_url ??
    brandingQuery.data?.logo_url ??
    null;
  const previewSite: PublicMarketingSite | null =
    siteQuery.data && header && footer
      ? {
          site_name: siteQuery.data.site_name,
          tagline: siteQuery.data.tagline,
          logo_url: previewLogoUrl,
          primary_color: siteQuery.data.theme_settings.primary_color ?? null,
          theme_settings: {
            ...siteQuery.data.theme_settings,
            logo_url: previewLogoUrl,
          },
          default_locale: siteQuery.data.default_locale,
          header,
          footer,
          // 预览要能显示同级页面菜单，所以带上真实页面清单（当前页用草稿标题）
          pages: (pagesQuery.data ?? []).map((item) => ({
            slug: item.slug,
            locale: item.locale,
            kind: item.kind,
            title: item.id === page?.id ? title : item.title,
            description: item.id === page?.id ? description : item.description,
            path: marketingPagePath(item.kind, item.slug),
          })),
        }
      : null;

  /** 选中项可能落在页面 section，也可能是页头 / 页脚。 */
  const selectedSection: SiteSection | null =
    [...sections, header, footer].find(
      (item): item is SiteSection =>
        item !== null && item.id === selection?.sectionId,
    ) ?? null;

  const selectedArea: EditorArea | null =
    selectedSection && selectedSection.id === header?.id
      ? "header"
      : selectedSection && selectedSection.id === footer?.id
        ? "footer"
        : null;

  /** 页头 / 页脚复用 sections 的 helper：包成单元素数组再取回。 */
  function mutateArea(
    area: EditorArea,
    update: (current: SiteSection[]) => SiteSection[],
  ): void {
    const setter = area === "header" ? setHeader : setFooter;
    setter((current) =>
      current ? (update([current])[0] ?? current) : current,
    );
  }

  function mutateSectionOrArea(
    sectionId: string,
    update: (current: SiteSection[]) => SiteSection[],
  ): void {
    if (header && sectionId === header.id) {
      mutateArea("header", update);
      return;
    }
    if (footer && sectionId === footer.id) {
      mutateArea("footer", update);
      return;
    }
    setSections(update);
  }

  return {
    siteQuery,
    pageQuery,
    page,
    path,
    sections,
    header,
    footer,
    title,
    setTitle,
    description,
    setDescription,
    selection,
    setSelection,
    selectedSectionId: selection?.sectionId ?? null,
    selectedSection,
    selectedBlockId: selection?.blockId ?? null,
    selectedArea,
    previewSite,
    mutations,

    selectSection: (sectionId: string, blockId: string | null = null): void => {
      setSelection({ sectionId, blockId });
    },

    /* ------------------------------------------------------ 页面 sections */

    moveSection: (index: number, direction: -1 | 1): void => {
      setSections((s) => moveSection(s, index, direction));
    },
    removeSection: (sectionId: string): void => {
      setSections((s) => removeSection(s, sectionId));
      if (selection?.sectionId === sectionId) setSelection(null);
    },
    addSection: (type: PageSectionType): void => {
      setSections((s) => {
        const next = addSection(s, type);
        const created = next[next.length - 1];
        if (created) setSelection({ sectionId: created.id, blockId: null });
        return next;
      });
    },
    /** 套用页面预设：整页替换 sections。 */
    replaceSections: (next: SiteSection[]): void => {
      setSections(next);
      setSelection(next[0] ? { sectionId: next[0].id, blockId: null } : null);
    },

    /* -------------------------------------- settings / blocks（两者通用） */

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
      if (createdId) setSelection({ sectionId, blockId: createdId });
    },
    removeBlock: (sectionId: string, blockId: string): void => {
      mutateSectionOrArea(sectionId, (s) => removeBlock(s, sectionId, blockId));
      if (selection?.blockId === blockId) {
        setSelection({ sectionId, blockId: null });
      }
    },
    moveBlock: (sectionId: string, index: number, direction: -1 | 1): void => {
      mutateSectionOrArea(sectionId, (s) =>
        moveBlock(s, sectionId, index, direction),
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
