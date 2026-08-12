import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { normalizeLocale, type AppLocale } from "@be-water/shared";

import { isTemplatePageKind } from "../../shared/page-templates.js";
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
  type MarketingPageVisibility,
  type PageLocaleAlternate,
  type PublicMarketingSite,
} from "../../shared/site-cms.js";
import { siteLocaleOrder, withSiteLocale } from "../../shared/site-locale.js";
import {
  addBlock,
  addSectionToColumn,
  findSection,
  hasColumnBlock,
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
  useSitePage,
  useSitePages,
} from "./useSite.js";

import type { ThemeSettings } from "../../shared/theme-sections.js";

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

/**
 * 一个编辑器管三样：**页面正文、页头页脚、主题**。
 *
 * `pageId` 可选——改导航或换配色不必先挑一张页面（站点一张页面都没有时也进得来）。
 * 有页面时保存走 `saveEditorDraft`（正文 + 站点级草稿同事务），没有则走
 * `saveSiteDraft`（只站点级）。
 */
export function useSiteEditor(pageId: string | undefined) {
  const siteQuery = useSite();
  const capabilitiesQuery = useSiteCapabilities();
  const pagesQuery = useSitePages();
  const pageQuery = useSitePage(pageId);
  const mutations = useSiteMutations();
  // 官网 logo 默认继承品牌资产。服务端只对**公开**站点做这个回落，管理端那份保持原样
  // （它要灌进设置表单，填进去一存就把继承关系写死了），所以预览在这里自己兜。

  const [sections, setSections] = useState<SiteSection[]>([]);
  const [header, setHeader] = useState<SiteSection[]>([]);
  const [footer, setFooter] = useState<SiteSection[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageSettings, setPageSettings] = useState<MarketingPageSettings>({});
  const [visibility, setVisibility] =
    useState<MarketingPageVisibility>("public");
  const [theme, setTheme] = useState<ThemeSettings>({});
  // 主题「出发点」：套用主题包时记下 key，保存时随主题草稿一起落库
  const [themeKey, setThemeKey] = useState<string | null>(null);
  const [chromeLocale, setChromeLocale] = useState<AppLocale>("zh-CN");
  const [selection, setSelection] = useState<ThemeEditorSelection | null>(null);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);

  /*
   * 没打开页面时只等站点数据：页头页脚与主题本来就不依赖任何一张页面，
   * 一张页面都没有的站点照样要能改导航和配色。
   */
  useEffect(() => {
    if (!siteQuery.data) return;
    if (pageId && !pageQuery.data) return;
    const pageKey = pageQuery.data
      ? `${pageQuery.data.id}:${pageQuery.data.updated_at}`
      : "site";
    const key = `${pageKey}:${siteQuery.data.updated_at}`;
    if (hydratedKey === key) return;

    const serverSections = pageQuery.data?.sections ?? [];
    const serverHeader = siteQuery.data.header;
    const serverFooter = siteQuery.data.footer;
    const serverTheme = siteQuery.data.theme_settings;
    const serverTitle = pageQuery.data?.title ?? "";
    const serverDescription = pageQuery.data?.description ?? "";
    const serverSettings = pageQuery.data?.settings ?? {};
    const serverVisibility = pageQuery.data?.visibility ?? "public";
    const serverSnapshot = draftSnapshot(
      serverSections,
      serverHeader,
      serverFooter,
      serverTheme,
      serverTitle,
      serverDescription,
      serverSettings,
      serverVisibility,
    );

    const cached = readEditorCache(pageId);
    const useCache =
      cached &&
      cached.serverKey === key &&
      draftSnapshot(
        cached.sections,
        cached.header,
        cached.footer,
        cached.theme ?? serverTheme,
        cached.title,
        cached.description,
        cached.settings ?? {},
        cached.visibility ?? "public",
      ) !== serverSnapshot;

    const nextSections = useCache ? cached.sections : serverSections;
    const nextHeader = useCache ? cached.header : serverHeader;
    const nextFooter = useCache ? cached.footer : serverFooter;
    const nextTheme = useCache ? (cached.theme ?? serverTheme) : serverTheme;
    const nextTitle = useCache ? cached.title : serverTitle;
    const nextDescription = useCache ? cached.description : serverDescription;
    const nextSettings = useCache
      ? (cached.settings ?? {})
      : serverSettings;
    const nextVisibility = useCache
      ? (cached.visibility ?? "public")
      : serverVisibility;

    setSections(nextSections);
    setHeader(nextHeader);
    setFooter(nextFooter);
    setTheme(nextTheme);
    setThemeKey(
      useCache
        ? (cached.themeKey ?? siteQuery.data.theme_key)
        : siteQuery.data.theme_key,
    );
    setTitle(nextTitle);
    setDescription(nextDescription);
    setPageSettings(nextSettings);
    setVisibility(nextVisibility);
    const firstId = nextSections[0]?.id ?? null;
    setSelection(
      pageId
        ? firstId
          ? { kind: "section", sectionId: firstId, blockId: null }
          : { kind: "meta" }
        : // 没有页面就没有 meta 那一行，落在页头第一段上
          (nextHeader[0]?.id ?? null) !== null
          ? { kind: "section", sectionId: nextHeader[0]!.id, blockId: null }
          : null,
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
      draftSnapshot(
        sections,
        header,
        footer,
        theme,
        title,
        description,
        pageSettings,
        visibility,
      );

  useEffect(() => {
    if (!hydratedKey || baseline === null) return;
    if (!dirty) return;
    writeEditorCache(pageId, {
      serverKey: hydratedKey,
      sections,
      header,
      footer,
      theme,
      themeKey,
      title,
      description,
      settings: pageSettings,
      visibility,
    });
  }, [
    pageId,
    hydratedKey,
    baseline,
    dirty,
    sections,
    header,
    footer,
    theme,
    themeKey,
    title,
    description,
    pageSettings,
    visibility,
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
  /*
   * 有页面时语言就是**这一行页面的语言**（页面按语言分行存，切语言 = 切到同 slug
   * 的另一行）。没有页面时页头页脚仍然要能逐语言校对文案——它们是逐字段翻译的，
   * 不依赖任何一行页面，所以另给一个本地的编辑语言。
   */
  const locale: AppLocale = page ? page.locale : chromeLocale;

  // 站点主语言拉回来之后把本地编辑语言对齐过去（初值只是个占位）
  useEffect(() => {
    setChromeLocale(defaultLocale);
  }, [defaultLocale]);

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
   * 预览里的「站点页面目录」——必须与公开面**同一套口径**（见 `toPublicMarketingSite`）：
   * 只算已发布的，且排除文档模板页。
   *
   * 少这两道过滤，预览的页头导航会比线上多出几条：草稿页面（还没发布，访客看不到）
   * 和文档模板页（`doc_article` 根本没有自己的地址）。而页头导航默认就是一条「全部
   * 一级页面」的动态项，所以每建一张草稿页，预览与实际就多差一条——差异恰好出现在
   * 租户最信任预览的时候（刚建完页面、正在排版）。
   *
   * 正在编辑的这一页用编辑器里的标题，不用列表里那份：改了标题还没保存时，导航里
   * 该跟着变。
   */
  const previewNavPages = localePages
    .filter((item) => item.status === "published")
    .filter((item) => !isTemplatePageKind(item.kind))
    .map((item) => ({
      slug: item.slug,
      locale: item.locale,
      kind: item.kind,
      title: item.id === page?.id ? title : item.title,
      description: item.id === page?.id ? description : item.description,
      path: marketingPagePath(item.kind, item.slug),
      settings: item.settings,
    }));

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

  // 预览吃**草稿**主题：改一个色号右边当场就变，不用先保存
  const previewLogoUrl = theme.logo_url ?? null;
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
        primary_color: theme.primary_color ?? null,
        theme_settings: { ...theme, logo_url: previewLogoUrl },
        default_locale: defaultLocale,
        locale,
        available_locales: localeVariants
          .filter((variant) => variant.pageId !== null)
          .map((variant) => variant.locale),
        // 草稿是管理端形状（多语言文案还是整张表），预览前压成当前语言，
        // 否则 `settingText` 拿到对象会一律渲染成空
        header: localizeSections(header, locale, defaultLocale),
        footer: localizeSections(footer, locale, defaultLocale),
        // `page-menu` section 与页头导航要能列出同语言下的其它页面
        pages: previewNavPages,
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

  /**
   * 分栏的某一列落在哪一串里。
   *
   * 分栏段现在页面和页脚都能放，「往列里加一段」于是不能再写死改页面那一串——
   * 那样往页脚分栏里加东西会静默落空（`appendToColumn` 找不到列就原样返回）。
   */
  const areaOfColumn = (columnBlockId: string): EditorArea | "page" | null => {
    if (hasColumnBlock(header, columnBlockId)) return "header";
    if (hasColumnBlock(footer, columnBlockId)) return "footer";
    if (hasColumnBlock(sections, columnBlockId)) return "page";
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
    /**
     * 本站具备哪些需另外开通的能力。
     *
     * 还没拉回来时按**不具备**算：反过来会让预览先画一枚登录按钮再抹掉，
     * 而线上从头到尾都没有它——预览闪一下比晚一拍出现更容易被当成 bug。
     */
    capabilities: {
      account_entry: capabilitiesQuery.data?.account_entry ?? false,
      /** 贡献段的闸门：没开通的不该出现在「添加区块」菜单里。 */
      entitlements: new Set(capabilitiesQuery.data?.entitlements ?? []),
      is_default_tenant: capabilitiesQuery.data?.is_default_tenant ?? false,
    },
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
    visibility,
    setVisibility,
    theme,
    setTheme,
    themeKey,
    setThemeKey,
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
    /** 只在没打开页面时有意义：有页面时语言由那一行决定，换语言得换页。 */
    setLocale: setChromeLocale,
    defaultLocale,
    localeVariants,
    localePages,
    dirty,
    /** 站点级草稿（页头 / 页脚 / 主题）领先线上。 */
    siteDraftDirty: siteQuery.data?.site_draft_dirty ?? false,
    contentDirty: pageQuery.data?.content_dirty ?? false,
    mutations,

    /**
     * 丢掉内存里这一版，回到库里已保存的草稿。
     *
     * 不逐字段还原：把缓存清掉再让 `hydratedKey` 失效，灌入那段 effect 会重跑一遍
     * ——服务端草稿是什么样，编辑器就回到什么样，多一条还原路径就多一处能对不齐。
     */
    discardLocalChanges: (): void => {
      clearEditorCache(pageId);
      setHydratedKey(null);
    },

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
        const area = areaOfColumn(target.columnBlockId);
        if (area === null) return;
        setterFor(area)((s) => {
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
  theme: ThemeSettings,
  title: string,
  description: string,
  settings: MarketingPageSettings,
  visibility: MarketingPageVisibility,
): string {
  return JSON.stringify([
    sections,
    header,
    footer,
    theme,
    title,
    description,
    settings,
    visibility,
  ]);
}

/** 没打开页面时也缓存一份（页头页脚 / 主题的草稿），共用同一套键。 */
function editorCacheKey(pageId: string | undefined): string {
  return `marketing-site-editor:${pageId ?? "site"}`;
}

interface EditorCachePayload {
  serverKey: string;
  sections: SiteSection[];
  header: SiteSection[];
  footer: SiteSection[];
  theme?: ThemeSettings;
  themeKey?: string | null;
  title: string;
  description: string;
  settings?: MarketingPageSettings;
  visibility?: MarketingPageVisibility;
}

function readEditorCache(
  pageId: string | undefined,
): EditorCachePayload | null {
  try {
    const raw = sessionStorage.getItem(editorCacheKey(pageId));
    if (!raw) return null;
    return JSON.parse(raw) as EditorCachePayload;
  } catch {
    return null;
  }
}

export function writeEditorCache(
  pageId: string | undefined,
  payload: EditorCachePayload,
): void {
  try {
    sessionStorage.setItem(editorCacheKey(pageId), JSON.stringify(payload));
  } catch {
    // 配额满或隐私模式：静默跳过
  }
}

export function clearEditorCache(pageId: string | undefined): void {
  try {
    sessionStorage.removeItem(editorCacheKey(pageId));
  } catch {
    // ignore
  }
}
