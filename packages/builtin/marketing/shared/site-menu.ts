/**
 * 站点级导航菜单：**一处配置，页头 / 页脚共用**。
 *
 * 以前「配一条链接」散在三个互不相干的地方——页头的 `nav_link` 块、页脚的
 * `footer_link` 块（还靠自由文本 `group` 分列）、以及 `show_site_nav` 这个
 * 「把一级页面全列出来」的开关。三套 schema 说的是同一件事，租户想让同一批链接
 * 同时出现在页头和页脚就得原样配两遍，改一次也要改两遍。
 *
 * 现在链接只存在于菜单里，页头 / 页脚各自**选一个菜单**（见 `sections/header`、
 * `sections/footer`）。菜单不进 section 体系：它是被引用的数据，不是被摆放的区块。
 *
 * 与 `site-cms` 刻意保持无依赖（页面目录由调用方以 `{ path, title }` 形状传进来），
 * 否则 `site-cms` 引本文件的菜单类型会连成一圈——模块包的 `import-x/no-cycle` 是 error。
 */

import {
  docMessages,
  docPath,
  DOCS_INDEX_PATH,
  groupDocsByCategory,
  type PublicDocSummary,
} from "./marketing-doc.js";
import {
  isLocalizedText,
  resolveLocalizedText,
  type LocalizedText,
} from "./section-settings.js";
import { localizeSiteHref } from "./site-locale.js";

import type { AppLocale } from "@be-water/shared";

/* -------------------------------------------------------------------------- */
/* 存储结构                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 一条菜单项的来源。
 *
 * `link` 之外的三种是**动态项**：租户配的是一条规则，展开成哪些链接由内容决定。
 * 这正是「文档进导航」难受的根源——以前只能一篇篇挑，新写一篇就得回来补一条。
 */
export const SITE_MENU_SOURCES = [
  /** 手填 / 从站内选的一条链接。 */
  "link",
  /** 全部已发布一级页面（取代原来的 `show_site_nav` 开关）。 */
  "pages",
  /** 整个文档库目录，按分类分组。 */
  "docs",
  /** 指定分类下的全部已发布文档。 */
  "doc_category",
] as const;

export type SiteMenuSource = (typeof SITE_MENU_SOURCES)[number];

/**
 * 动态项展开成什么形状。
 *
 * - `children`：收成一个可展开的父项（页头下拉菜单、页脚列里的小标题）
 * - `flat`：就地铺平，与前后的静态项混在同一层
 */
export const SITE_MENU_EXPANDS = ["children", "flat"] as const;
export type SiteMenuExpand = (typeof SITE_MENU_EXPANDS)[number];

export interface SiteMenuItem {
  id: string;
  source: SiteMenuSource;
  /**
   * 显示文案。多语言表与 section 设置同一形状（`{ __i18n: {...} }`），渲染期压成字符串。
   *
   * 动态项留空即用内置文案（如文档库的「文档」），所以只有 `link` 项是必填。
   */
  label: string | LocalizedText;
  /** 仅 `link`：逻辑路径或外链，存法与 section 的 `link` 设置完全一致。 */
  href: string;
  /** 仅 `doc_category`：分类名，与 `MarketingDoc.category` 逐字匹配。 */
  category: string;
  /** 仅动态项。 */
  expand: SiteMenuExpand;
  /**
   * 仅 `link`：一层子菜单。
   *
   * 只允许一层——两层以上的下拉在页头里没人点得到，页脚列里更是排不下。子项自己
   * 也可以是动态项（「文档」下面挂「入门指南」这一分类就是这么配的）。
   */
  children: SiteMenuItem[];
}

export interface SiteMenu {
  /**
   * 稳定标识，section 设置里存的就是它。
   *
   * 用 key 而不是 uuid：租户在编辑器里看到的是「主导航」「产品」这样的名字，
   * 出问题时 `menu = "main"` 比一串 uuid 好认得多。
   */
  key: string;
  /** 菜单名；页脚列直接拿它当列标题（可被列自己覆盖）。 */
  title: string | LocalizedText;
  items: SiteMenuItem[];
}

/** 页头默认引用的菜单。建站时必然存在，删不掉（见 `parseSiteMenus`）。 */
export const MAIN_MENU_KEY = "main";

const MAX_MENUS = 12;
const MAX_ITEMS_PER_MENU = 40;
const MAX_CHILDREN = 20;
const MAX_LABEL_LENGTH = 80;
const MAX_HREF_LENGTH = 2048;

/** 菜单 key：小写字母数字加连字符，和页面 slug 同一套观感。 */
const MENU_KEY_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/u;

export function createMenuItemId(): string {
  return crypto.randomUUID();
}

/** 由菜单名生成 key；生成不出（纯中文名）就退回随机短串，key 本来就不给人读。 */
export function menuKeyFromTitle(
  title: string,
  taken: readonly string[] = [],
): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 24) || `menu-${crypto.randomUUID().slice(0, 6)}`;
  if (!taken.includes(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}-${index}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

/* -------------------------------------------------------------------------- */
/* 解析                                                                        */
/* -------------------------------------------------------------------------- */

function parseLabel(raw: unknown): string | LocalizedText {
  if (typeof raw === "string") return raw.slice(0, MAX_LABEL_LENGTH);
  if (isLocalizedText(raw)) {
    const table: Record<string, string> = {};
    for (const [locale, text] of Object.entries(raw.__i18n)) {
      if (typeof text === "string") {
        table[locale] = text.slice(0, MAX_LABEL_LENGTH);
      }
    }
    return { __i18n: table };
  }
  return "";
}

function parseSource(raw: unknown): SiteMenuSource {
  return (SITE_MENU_SOURCES as readonly string[]).includes(raw as string)
    ? (raw as SiteMenuSource)
    : "link";
}

function parseItem(raw: unknown, depth: number): SiteMenuItem | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const source = parseSource(record.source);
  const label = parseLabel(record.label);
  const href =
    typeof record.href === "string"
      ? record.href.trim().slice(0, MAX_HREF_LENGTH)
      : "";

  /*
   * 静态项没标签就是**没配完**，直接丢——渲染出一个没有字的 `<a>` 只会让租户
   * 以为页头坏了。动态项相反：标签可以空，内置文案顶上。
   */
  if (source === "link" && labelIsEmpty(label)) return null;

  const children =
    source === "link" && depth === 0 && Array.isArray(record.children)
      ? record.children
          .map((child) => parseItem(child, depth + 1))
          .filter((child): child is SiteMenuItem => child !== null)
          .slice(0, MAX_CHILDREN)
      : [];

  return {
    id: typeof record.id === "string" && record.id ? record.id : createMenuItemId(),
    source,
    label,
    href: source === "link" ? href : "",
    category:
      source === "doc_category" && typeof record.category === "string"
        ? record.category.trim().slice(0, MAX_LABEL_LENGTH)
        : "",
    expand: record.expand === "flat" ? "flat" : "children",
    children,
  };
}

function labelIsEmpty(label: string | LocalizedText): boolean {
  if (typeof label === "string") return label.trim() === "";
  return Object.values(label.__i18n).every((text) => text.trim() === "");
}

function parseMenu(raw: unknown, taken: string[]): SiteMenu | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const rawKey = typeof record.key === "string" ? record.key.trim() : "";
  // key 不合法 / 重复的菜单直接丢：留着它只会让引用它的 section 指向一团不确定的东西
  if (!MENU_KEY_RE.test(rawKey) || taken.includes(rawKey)) return null;
  taken.push(rawKey);
  return {
    key: rawKey,
    title: parseLabel(record.title),
    items: Array.isArray(record.items)
      ? record.items
          .map((item) => parseItem(item, 0))
          .filter((item): item is SiteMenuItem => item !== null)
          .slice(0, MAX_ITEMS_PER_MENU)
      : [],
  };
}

/**
 * 读库容错：坏条目逐条跳过，不因为一条脏数据把整套导航清空。
 *
 * `main` 恒在——页头的 `menu` 设置默认指向它，缺了的话新建站点第一次进编辑器
 * 会看到一个「菜单不存在」的空下拉，而不是一份可以直接改的默认导航。
 */
export function safeSiteMenus(value: unknown): SiteMenu[] {
  const taken: string[] = [];
  const menus = Array.isArray(value)
    ? value
        .map((raw) => parseMenu(raw, taken))
        .filter((menu): menu is SiteMenu => menu !== null)
        .slice(0, MAX_MENUS)
    : [];
  if (menus.some((menu) => menu.key === MAIN_MENU_KEY)) return menus;
  return [defaultMainMenu(), ...menus];
}

/**
 * 写路径：形状不对直接拒收（`site.menus_invalid`），不静默吞掉。
 *
 * 与读路径的差别只在这里——编辑器提交了一份存不下的菜单，应该当场报错让它重试，
 * 而不是存进去一份被悄悄裁剪过的、和界面上看到的不一样的东西。
 */
export function parseSiteMenus(value: unknown): SiteMenu[] {
  if (value === undefined || value === null) return [defaultMainMenu()];
  if (!Array.isArray(value)) throw new Error("site.menus_invalid");
  if (value.length > MAX_MENUS) throw new Error("site.menus_invalid");
  const taken: string[] = [];
  const menus: SiteMenu[] = [];
  for (const raw of value) {
    const menu = parseMenu(raw, taken);
    if (!menu) throw new Error("site.menus_invalid");
    menus.push(menu);
  }
  if (!menus.some((menu) => menu.key === MAIN_MENU_KEY)) {
    menus.unshift(defaultMainMenu());
  }
  return menus;
}

/**
 * 建站默认主导航：一条「全部一级页面」动态项。
 *
 * 等价于原来默认打开的 `show_site_nav`，但现在它是菜单里可以拖走、可以和自定义
 * 链接换顺序的一条——以前自定义链接只能**追加在自动条目之后**，想把「定价」排在
 * 「关于」前面是做不到的。
 */
export function defaultMainMenu(): SiteMenu {
  return {
    key: MAIN_MENU_KEY,
    title: "",
    items: [
      {
        id: createMenuItemId(),
        source: "pages",
        label: "",
        href: "",
        category: "",
        expand: "flat",
        children: [],
      },
    ],
  };
}

export function findSiteMenu(
  menus: readonly SiteMenu[],
  key: string,
): SiteMenu | null {
  return menus.find((menu) => menu.key === key) ?? null;
}

/* -------------------------------------------------------------------------- */
/* 渲染期展开                                                                  */
/* -------------------------------------------------------------------------- */

/** 展开菜单需要的内容快照；页面目录按结构传，避免回指 `site-cms`。 */
export interface SiteMenuContext {
  /** 已筛过的一级页面（调用方用 `siteNavPages` 算好）。 */
  navPages?: readonly { path: string; title: string }[];
  /** 已发布文档目录（服务端已按 category / sort_order 排好）。 */
  docs?: readonly PublicDocSummary[];
  locale: AppLocale;
  defaultLocale: AppLocale;
  /** 当前页的逻辑路径（不带 locale 前缀），用于 `aria-current`。 */
  currentPath?: string;
}

/**
 * 展开后的一条：**渲染端只认这个形状**，不需要知道它原本是静态链接还是一条规则。
 */
export interface ResolvedMenuItem {
  /** React key / SSR 去重用；同一份数据每次展开都稳定。 */
  key: string;
  label: string;
  /** 空串 = 纯分组标题（文档分类那一层），渲染成不可点的小标题。 */
  href: string;
  current: boolean;
  children: ResolvedMenuItem[];
}

function localizeLabel(
  label: string | LocalizedText,
  ctx: SiteMenuContext,
): string {
  return typeof label === "string"
    ? label
    : resolveLocalizedText(label, ctx.locale, ctx.defaultLocale);
}

function makeLink(
  key: string,
  label: string,
  logicalPath: string,
  ctx: SiteMenuContext,
  children: ResolvedMenuItem[] = [],
): ResolvedMenuItem {
  return {
    key,
    label,
    href: logicalPath
      ? localizeSiteHref(logicalPath, ctx.locale, ctx.defaultLocale)
      : "",
    // 用**逻辑路径**比，不是最终 URL——否则每种语言都要各写一次比较规则
    current: logicalPath !== "" && logicalPath === ctx.currentPath,
    children,
  };
}

function docItems(
  docs: readonly PublicDocSummary[],
  ctx: SiteMenuContext,
  keyPrefix: string,
): ResolvedMenuItem[] {
  return docs.map((doc) =>
    makeLink(`${keyPrefix}:${doc.slug}`, doc.title, docPath(doc.slug), ctx),
  );
}

/**
 * 一条菜单项 → 零到多条渲染项。
 *
 * 动态项展开不出内容时返回空数组（而不是一个空壳）：一个还没写文档的站点，
 * 页头不该出现一个点开是空的「文档」下拉。
 */
function resolveItem(
  item: SiteMenuItem,
  ctx: SiteMenuContext,
): ResolvedMenuItem[] {
  const label = localizeLabel(item.label, ctx);

  switch (item.source) {
    case "link": {
      if (!item.href && item.children.length === 0) return [];
      const children = item.children.flatMap((child) =>
        resolveItem(child, ctx),
      );
      return [makeLink(item.id, label, item.href, ctx, children)];
    }

    case "pages": {
      const pages = ctx.navPages ?? [];
      if (pages.length === 0) return [];
      const items = pages.map((page) =>
        makeLink(`${item.id}:${page.path}`, page.title, page.path, ctx),
      );
      return item.expand === "flat"
        ? items
        : [makeLink(item.id, label, "", ctx, items)];
    }

    case "docs": {
      const docs = ctx.docs ?? [];
      const messages = docMessages(ctx.locale);
      if (docs.length === 0) return [];
      if (item.expand === "flat") {
        return docItems(docs, ctx, item.id);
      }
      /*
       * 按分类分组挂在父项下——「页脚一列直接接文档目录」要的就是这个形状，
       * 页头下拉拿到同一份数据则画成带小标题的下拉。分类只有一组时不套这层壳：
       * 一个「其它」标题底下挂着全部文档，纯属噪音。
       */
      const groups = groupDocsByCategory(docs, messages.otherCategory);
      const children =
        groups.length > 1
          ? groups.map((group) => ({
              key: `${item.id}:${group.category}`,
              label: group.category,
              href: "",
              current: false,
              children: docItems(group.items, ctx, `${item.id}:${group.category}`),
            }))
          : docItems(docs, ctx, item.id);
      return [
        makeLink(item.id, label || messages.nav, DOCS_INDEX_PATH, ctx, children),
      ];
    }

    case "doc_category": {
      const docs = (ctx.docs ?? []).filter(
        (doc) => doc.category === item.category,
      );
      if (docs.length === 0) return [];
      const items = docItems(docs, ctx, item.id);
      return item.expand === "flat"
        ? items
        : [makeLink(item.id, label || item.category, "", ctx, items)];
    }

    default:
      return [];
  }
}

/** 展开整个菜单。 */
export function resolveSiteMenu(
  menu: SiteMenu | null,
  ctx: SiteMenuContext,
): ResolvedMenuItem[] {
  if (!menu) return [];
  return menu.items.flatMap((item) => resolveItem(item, ctx));
}

/** 菜单名（页脚列标题用）；未命名时返回空串由调用方决定要不要占位。 */
export function resolveSiteMenuTitle(
  menu: SiteMenu | null,
  ctx: SiteMenuContext,
): string {
  return menu ? localizeLabel(menu.title, ctx) : "";
}

/**
 * 这套菜单里有没有吃文档数据的动态项。
 *
 * SSR 用它决定要不要为这次请求查一趟文档目录。以前这个判断看的是「页面上有没有
 * 摆 `doc-*` 段」，菜单出现后不够了：页头挂一条「文档」动态项、页面上一个 doc 段
 * 都没有，是完全正常的配置，而漏查的后果是页头的文档入口**静默消失**。
 *
 * 不细究「页头页脚具体引用了哪几个菜单」：多查一次的代价是一条按租户走索引的
 * SELECT，而算错的代价是导航少一块，两边不对等。
 */
export function siteMenusNeedDocs(menus: readonly SiteMenu[]): boolean {
  const needsDocs = (item: SiteMenuItem): boolean =>
    item.source === "docs" ||
    item.source === "doc_category" ||
    item.children.some(needsDocs);
  return menus.some((menu) => menu.items.some(needsDocs));
}

/** 编辑器下拉的选项表（`menu` 设置项的数据源）。 */
export function siteMenuOptions(
  menus: readonly SiteMenu[],
  fallbackLabel: (key: string) => string,
): Array<{ value: string; label: string }> {
  return menus.map((menu) => ({
    value: menu.key,
    label:
      (typeof menu.title === "string"
        ? menu.title
        : Object.values(menu.title.__i18n).find((text) => text.trim() !== "")) ||
      fallbackLabel(menu.key),
  }));
}
