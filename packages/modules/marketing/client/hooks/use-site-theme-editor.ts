import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { useTenantBranding } from "@be-water/client-kit";
import { normalizeLocale, type AppLocale } from "@be-water/shared";

import {
  localizeSections,
  localizeSiteText,
  createSection,
  type PageSectionType,
  type SectionType,
  type SettingValues,
  type SiteSection,
} from "../../shared/section-schema.js";
import {
  marketingPagePath,
  type MarketingPage,
  type MarketingPageListItem,
  type MarketingPageSettings,
  type PageLocaleAlternate,
  type PublicMarketingSite,
} from "../../shared/site-cms.js";
import { siteLocaleOrder, withSiteLocale } from "../../shared/site-locale.js";
import {
  addBlock,
  addSectionToColumn,
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
  useSiteMutations,
  useSitePage,
  useSitePages,
} from "./useSite.js";

/**
 * 当前选中项。
 *
 * `meta` 是页面自己（标题 / SEO 描述）——它不是一段 section，但在左树里要占一行，
 * 否则改元数据得退回页面列表。其余是 section 本身（`blockId: null`）或其下某个 block。
 */
export type ThemeEditorSelection =
  | { kind: "meta" }
  | { kind: "section"; sectionId: string; blockId: string | null };

/** 新段加到哪儿（与 `SectionTree` 的 `AddTarget` 同形）。 */
export type AddSectionTarget =
  | { kind: "page" }
  | { kind: "column"; columnBlockId: string }
  | { kind: "area"; area: "header" | "footer" };

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
  const [header, setHeader] = useState<SiteSection[]>([]);
  const [footer, setFooter] = useState<SiteSection[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageSettings, setPageSettings] = useState<MarketingPageSettings>({});
  const [selection, setSelection] = useState<ThemeEditorSelection | null>(null);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);

  useEffect(() => {
    if (!pageQuery.data || !siteQuery.data || !pageId) return;
    const key = `${pageQuery.data.id}:${pageQuery.data.updated_at}:${siteQuery.data.updated_at}`;
    if (hydratedKey === key) return;

    const serverSections = pageQuery.data.sections;
    const serverHeader = siteQuery.data.header;
    const serverFooter = siteQuery.data.footer;
    const serverTitle = pageQuery.data.title;
    const serverDescription = pageQuery.data.description;
    const serverSettings = pageQuery.data.settings ?? {};
    const serverSnapshot = draftSnapshot(
      serverSections,
      serverHeader,
      serverFooter,
      serverTitle,
      serverDescription,
      serverSettings,
    );

    const cached = readEditorCache(pageId);
    const useCache =
      cached &&
      cached.serverKey === key &&
      draftSnapshot(
        cached.sections,
        cached.header,
        cached.footer,
        cached.title,
        cached.description,
        cached.settings ?? {},
      ) !== serverSnapshot;

    const nextSections = useCache ? cached.sections : serverSections;
    const nextHeader = useCache ? cached.header : serverHeader;
    const nextFooter = useCache ? cached.footer : serverFooter;
    const nextTitle = useCache ? cached.title : serverTitle;
    const nextDescription = useCache ? cached.description : serverDescription;
    const nextSettings = useCache
      ? (cached.settings ?? {})
      : serverSettings;

    setSections(nextSections);
    setHeader(nextHeader);
    setFooter(nextFooter);
    setTitle(nextTitle);
    setDescription(nextDescription);
    setPageSettings(nextSettings);
    const firstId = nextSections[0]?.id ?? null;
    setSelection(
      firstId
        ? { kind: "section", sectionId: firstId, blockId: null }
        : { kind: "meta" },
    );
    setBaseline(serverSnapshot);
    setHydratedKey(key);
  }, [pageQuery.data, siteQuery.data, hydratedKey, pageId]);

  /**
   * 是否有未保存改动：与灌入时的快照逐字比。
   * 编辑器里离开页面（换页 / 换语言）会把草稿整个丢掉，得先拦一下。
   */
  const dirty =
    baseline !== null &&
    baseline !==
      draftSnapshot(sections, header, footer, title, description, pageSettings);

  useEffect(() => {
    if (!pageId || !hydratedKey || baseline === null) return;
    if (!dirty) return;
    writeEditorCache(pageId, {
      serverKey: hydratedKey,
      sections,
      header,
      footer,
      title,
      description,
      settings: pageSettings,
    });
  }, [
    pageId,
    hydratedKey,
    baseline,
    dirty,
    sections,
    header,
    footer,
    title,
    description,
    pageSettings,
  ]);

  const page: MarketingPage | undefined = pageQuery.data;
  const path = page ? marketingPagePath(page.kind, page.slug) : "/";

  /*
   * 编辑器的语言就是**当前这一行页面的语言**——页面按语言分行存，所以「切语言」
   * 等于切到同 slug 的另一行（见 localeVariants）。站点级的页头 / 页脚是逐字段
   * 翻译的，跟着同一个语言走即可。
   */
  const defaultLocale: AppLocale = normalizeLocale(
    siteQuery.data?.default_locale,
  );
  const locale: AppLocale = page ? page.locale : defaultLocale;

  /** 同一篇内容的各语言行；`pageId` 为 null 表示该语言还没建。 */
  const localeVariants: Array<{ locale: AppLocale; pageId: string | null }> =
    siteLocaleOrder(defaultLocale).map((slug) => ({
      locale: slug,
      pageId:
        (pagesQuery.data ?? []).find(
          (item) =>
            item.locale === slug &&
            item.slug === page?.slug &&
            item.kind === page?.kind,
        )?.id ?? null,
    }));

  /** 同语言下的全部页面，按列表顺序（服务端已按 `sort_order`）。 */
  const localePages: MarketingPageListItem[] = (pagesQuery.data ?? []).filter(
    (item) => item.locale === locale,
  );

  /**
   * 预览用的语言入口：已经建出来的语言各一条。
   *
   * 与公开面的 `page.alternates` 同形状——页头的语言切换器（站点设置里的全局开关）
   * 得有候选才渲染得出来，否则租户在预览里看不到自己刚打开的开关。
   */
  const previewAlternates: PageLocaleAlternate[] = localeVariants
    .filter((variant) => variant.pageId !== null)
    .map((variant) => ({
      locale: variant.locale,
      path: withSiteLocale(path, variant.locale, defaultLocale),
    }));

  // 主题设置已并入「系统管理 → 品牌」，编辑器只读取它做预览。
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
        tagline: siteQuery.data.tagline,
        logo_url: previewLogoUrl,
        primary_color: siteQuery.data.theme_settings.primary_color ?? null,
        theme_settings: {
          ...siteQuery.data.theme_settings,
          logo_url: previewLogoUrl,
        },
        default_locale: defaultLocale,
        locale,
        available_locales: localeVariants
          .filter((variant) => variant.pageId !== null)
          .map((variant) => variant.locale),
        // 草稿是管理端形状（多语言文案还是整张表），预览前压成当前语言，
        // 否则 `settingText` 拿到对象会一律渲染成空
        header: localizeSections(header, locale, defaultLocale),
        footer: localizeSections(footer, locale, defaultLocale),
        // `page-menu` section 要能列出同语言下的其它页面
        pages: localePages.map((item) => ({
          slug: item.slug,
          locale: item.locale,
          kind: item.kind,
          title: item.id === page?.id ? title : item.title,
          description: item.id === page?.id ? description : item.description,
          path: marketingPagePath(item.kind, item.slug),
          settings: item.settings,
        })),
      }
    : null;

  /** 预览用的页面 sections：同样压成当前语言。 */
  const previewSections = localizeSections(sections, locale, defaultLocale);

  /**
   * 选中项可能落在页面 section（含容器段列里的子段，所以要在整棵树上找），
   * 也可能是页头 / 页脚。
   */
  const selectedSectionId =
    selection?.kind === "section" ? selection.sectionId : null;
  const selectedBlockId =
    selection?.kind === "section" ? selection.blockId : null;

  /**
   * 选中项落在三串 section 的哪一串里。
   *
   * 页头 / 页脚现在也是普通的 section 数组，与页面区块**同构**——所有树上操作
   * （增删、排序、拖放、改设置）因此是同一套，不再有「区域」特例。
   */
  const areaOf = (sectionId: string | null): EditorArea | "page" | null => {
    if (!sectionId) return null;
    if (findSection(header, sectionId)) return "header";
    if (findSection(footer, sectionId)) return "footer";
    if (findSection(sections, sectionId)) return "page";
    return null;
  };

  const selectedSection: SiteSection | null = selectedSectionId
    ? (findSection(sections, selectedSectionId) ??
      findSection(header, selectedSectionId) ??
      findSection(footer, selectedSectionId))
    : null;

  const selectedArea = areaOf(selectedSectionId);

  const setterFor = (
    area: EditorArea | "page" | null,
  ): Dispatch<SetStateAction<SiteSection[]>> =>
    area === "header" ? setHeader : area === "footer" ? setFooter : setSections;

  /** 按 id 找到它所在的那一串，就地改写。 */
  function mutateSectionOrArea(
    sectionId: string,
    update: (current: SiteSection[]) => SiteSection[],
  ): void {
    setterFor(areaOf(sectionId))(update);
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
    pageSettings,
    setPageSettings,
    selection,
    setSelection,
    selectedSectionId,
    selectedSection,
    selectedBlockId,
    /** 选中的是页面元数据而不是某一段。 */
    metaSelected: selection?.kind === "meta",
    selectedArea,
    previewSite,
    previewSections,
    previewAlternates,
    locale,
    defaultLocale,
    localeVariants,
    localePages,
    dirty,
    chromeDirty: siteQuery.data?.chrome_dirty ?? false,
    contentDirty: pageQuery.data?.content_dirty ?? false,
    mutations,

    selectSection: (sectionId: string, blockId: string | null = null): void => {
      setSelection({ kind: "section", sectionId, blockId });
    },
    selectMeta: (): void => setSelection({ kind: "meta" }),

    /* ------------------------------------------------------ 页面 sections */

    /** 按 id 在自己所属的兄弟集合内移动（容器段的列里同理）。 */
    moveSection: (sectionId: string, direction: -1 | 1): void => {
      setterFor(areaOf(sectionId))((s) => moveSection(s, sectionId, direction));
    },
    /**
     * 搬移一段：同层换位与跨层换爹（页面顶层 ⇄ 分栏的列）统一走它。
     * 违反嵌套规矩（容器段进列、拖进自己里面）时是空操作。
     */
    moveSectionTo: (sourceId: string, target: SectionDropTarget): void => {
      setterFor(areaOf(sourceId))((s) => moveSectionTo(s, sourceId, target));
      setSelection({ kind: "section", sectionId: sourceId, blockId: null });
    },
    removeSection: (sectionId: string): void => {
      setterFor(areaOf(sectionId))((s) => removeSection(s, sectionId));
      if (selectedSectionId === sectionId) setSelection({ kind: "meta" });
    },
    /** 往页面末尾 / 某一列 / 页头页脚区加一段。 */
    addSection: (type: SectionType, target: AddSectionTarget): void => {
      if (target.kind === "column") {
        setSections((s) => {
          const { sections: next, created } = addSectionToColumn(
            s,
            target.columnBlockId,
            type as PageSectionType,
          );
          setSelection({
            kind: "section",
            sectionId: created.id,
            blockId: null,
          });
          return next;
        });
        return;
      }
      const created = createSection(type);
      setSelection({ kind: "section", sectionId: created.id, blockId: null });
      const setter =
        target.kind === "area"
          ? target.area === "header"
            ? setHeader
            : setFooter
          : setSections;
      // 页头区的新段排在导航条**上方**（公告条的通例），其余追加到末尾
      setter((current) =>
        target.kind === "area" && target.area === "header"
          ? [created, ...current]
          : [...current, created],
      );
    },
    /** 套用页面预设：整页替换 sections。 */
    replaceSections: (next: SiteSection[]): void => {
      setSections(next);
      setSelection(
        next[0]
          ? { kind: "section", sectionId: next[0].id, blockId: null }
          : { kind: "meta" },
      );
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
      if (createdId)
        setSelection({ kind: "section", sectionId, blockId: createdId });
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

/** 草稿指纹：字段顺序固定，直接串起来比较即可。 */
function draftSnapshot(
  sections: SiteSection[],
  header: SiteSection[],
  footer: SiteSection[],
  title: string,
  description: string,
  settings: MarketingPageSettings,
): string {
  return JSON.stringify([sections, header, footer, title, description, settings]);
}

function editorCacheKey(pageId: string): string {
  return `marketing-theme-editor:${pageId}`;
}

interface EditorCachePayload {
  serverKey: string;
  sections: SiteSection[];
  header: SiteSection[];
  footer: SiteSection[];
  title: string;
  description: string;
  settings?: MarketingPageSettings;
}

function readEditorCache(pageId: string): EditorCachePayload | null {
  try {
    const raw = sessionStorage.getItem(editorCacheKey(pageId));
    if (!raw) return null;
    return JSON.parse(raw) as EditorCachePayload;
  } catch {
    return null;
  }
}

export function writeEditorCache(
  pageId: string,
  payload: EditorCachePayload,
): void {
  try {
    sessionStorage.setItem(editorCacheKey(pageId), JSON.stringify(payload));
  } catch {
    // 配额满或隐私模式：静默跳过
  }
}

export function clearEditorCache(pageId: string): void {
  try {
    sessionStorage.removeItem(editorCacheKey(pageId));
  } catch {
    // ignore
  }
}
