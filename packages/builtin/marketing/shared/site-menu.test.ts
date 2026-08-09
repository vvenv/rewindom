import { describe, expect, it } from "vitest";

import {
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteSection,
} from "./section-schema.js";
import { chromeNeedsDocList, chromeShowsDocSearch } from "./site-cms.js";
import {
  defaultMainMenu,
  findSiteMenu,
  MAIN_MENU_KEY,
  parseSiteMenus,
  resolveSiteMenu,
  safeSiteMenus,
  siteMenusNeedDocs,
  type SiteMenu,
  type SiteMenuContext,
  type SiteMenuItem,
} from "./site-menu.js";

function item(partial: Partial<SiteMenuItem> = {}): SiteMenuItem {
  return {
    id: partial.id ?? "i1",
    source: partial.source ?? "link",
    label: partial.label ?? "",
    href: partial.href ?? "",
    category: partial.category ?? "",
    expand: partial.expand ?? "children",
    children: partial.children ?? [],
  };
}

function menu(items: SiteMenuItem[], key = MAIN_MENU_KEY): SiteMenu {
  return { key, title: "", items };
}

const NAV_PAGES = [
  { path: "/about", title: "关于" },
  { path: "/pricing", title: "定价" },
];

const DOCS = [
  {
    slug: "intro",
    title: "介绍",
    description: "",
    category: "入门",
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    slug: "install",
    title: "安装",
    description: "",
    category: "入门",
    sort_order: 1,
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    slug: "api",
    title: "接口",
    description: "",
    category: "参考",
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

function ctx(partial: Partial<SiteMenuContext> = {}): SiteMenuContext {
  return {
    navPages: NAV_PAGES,
    docs: DOCS,
    locale: "zh-CN",
    defaultLocale: "zh-CN",
    ...partial,
  };
}

describe("resolveSiteMenu 静态链接", () => {
  it("多语言标签压成当前语言，站内 href 补 locale 前缀", () => {
    const resolved = resolveSiteMenu(
      menu([
        item({
          label: { __i18n: { "zh-CN": "关于", en: "About" } },
          href: "/about",
        }),
      ]),
      ctx({ locale: "en" }),
    );
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.label).toBe("About");
    expect(resolved[0]!.href).toBe("/en/about");
  });

  it("外链不加前缀", () => {
    const resolved = resolveSiteMenu(
      menu([item({ label: "博客", href: "https://example.com" })]),
      ctx({ locale: "en" }),
    );
    expect(resolved[0]!.href).toBe("https://example.com");
  });

  // current 按**逻辑路径**比，否则每种语言都要各写一次比较规则
  it("当前页标 current，且与语言前缀无关", () => {
    const resolved = resolveSiteMenu(
      menu([item({ label: "关于", href: "/about" })]),
      ctx({ locale: "en", currentPath: "/about" }),
    );
    expect(resolved[0]!.current).toBe(true);
  });

  it("既没有 href 也没有子项的条目不渲染", () => {
    expect(resolveSiteMenu(menu([item({ label: "空" })]), ctx())).toEqual([]);
  });
});

describe("resolveSiteMenu 动态项", () => {
  it("pages 平铺时就地展开成一级页面", () => {
    const resolved = resolveSiteMenu(
      menu([item({ source: "pages", expand: "flat" })]),
      ctx(),
    );
    expect(resolved.map((entry) => entry.href)).toEqual(["/about", "/pricing"]);
  });

  it("pages 收成子菜单时父项带标签", () => {
    const resolved = resolveSiteMenu(
      menu([item({ source: "pages", expand: "children", label: "产品" })]),
      ctx(),
    );
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.label).toBe("产品");
    expect(resolved[0]!.children).toHaveLength(2);
  });

  it("docs 收成子菜单时按分类分组，父项指向文档索引", () => {
    const resolved = resolveSiteMenu(
      menu([item({ source: "docs" })]),
      ctx(),
    );
    expect(resolved[0]!.href).toBe("/docs");
    // 标签留空 → 用内置文案
    expect(resolved[0]!.label).toBe("文档");
    expect(resolved[0]!.children.map((group) => group.label)).toEqual([
      "入门",
      "参考",
    ]);
    expect(resolved[0]!.children[0]!.children.map((doc) => doc.href)).toEqual([
      "/docs/intro",
      "/docs/install",
    ]);
  });

  // 一个「其它」标题底下挂着全部文档纯属噪音
  it("docs 只有一个分类时不套分组这一层", () => {
    const resolved = resolveSiteMenu(
      menu([item({ source: "docs" })]),
      ctx({ docs: DOCS.slice(0, 2) }),
    );
    expect(resolved[0]!.children.map((doc) => doc.href)).toEqual([
      "/docs/intro",
      "/docs/install",
    ]);
  });

  it("doc_category 只列该分类下的文档", () => {
    const resolved = resolveSiteMenu(
      menu([item({ source: "doc_category", category: "参考", expand: "flat" })]),
      ctx(),
    );
    expect(resolved.map((entry) => entry.href)).toEqual(["/docs/api"]);
  });

  /*
   * 展不出内容就整条不渲染：还没写文档的站点，页头不该出现一个点开是空的「文档」。
   */
  it("没有文档时文档动态项什么都不渲染", () => {
    expect(
      resolveSiteMenu(menu([item({ source: "docs" })]), ctx({ docs: [] })),
    ).toEqual([]);
    expect(
      resolveSiteMenu(
        menu([item({ source: "doc_category", category: "不存在" })]),
        ctx(),
      ),
    ).toEqual([]);
  });

  it("静态项可以挂一层动态子项", () => {
    const resolved = resolveSiteMenu(
      menu([
        item({
          label: "资源",
          href: "/resources",
          children: [
            item({
              id: "c1",
              source: "doc_category",
              category: "入门",
              expand: "flat",
            }),
          ],
        }),
      ]),
      ctx(),
    );
    expect(resolved[0]!.children.map((child) => child.href)).toEqual([
      "/docs/intro",
      "/docs/install",
    ]);
  });
});

describe("解析", () => {
  it("读路径丢掉坏条目并补上 main", () => {
    const menus = safeSiteMenus([
      { key: "OOPS!", title: "", items: [] },
      { key: "footer-1", title: "产品", items: [{ source: "link" }] },
    ]);
    expect(menus.map((entry) => entry.key)).toEqual([MAIN_MENU_KEY, "footer-1"]);
    // 静态项没标签 = 没配完，丢掉；渲染出一个没有字的 <a> 只会让人以为页头坏了
    expect(findSiteMenu(menus, "footer-1")!.items).toEqual([]);
  });

  it("读路径遇到整体脏值也保住 main", () => {
    expect(safeSiteMenus("nonsense").map((entry) => entry.key)).toEqual([
      MAIN_MENU_KEY,
    ]);
  });

  it("写路径对坏条目直接报错", () => {
    expect(() => parseSiteMenus([{ key: "OOPS!" }])).toThrow(
      "site.menus_invalid",
    );
    expect(() => parseSiteMenus("nonsense")).toThrow("site.menus_invalid");
  });

  it("写路径拒收重复 key", () => {
    expect(() =>
      parseSiteMenus([
        { key: "a", title: "", items: [] },
        { key: "a", title: "", items: [] },
      ]),
    ).toThrow("site.menus_invalid");
  });

  it("子项只允许一层", () => {
    const [parsed] = safeSiteMenus([
      {
        key: MAIN_MENU_KEY,
        title: "",
        items: [
          {
            source: "link",
            label: "一",
            href: "/a",
            children: [
              {
                source: "link",
                label: "二",
                href: "/b",
                children: [{ source: "link", label: "三", href: "/c" }],
              },
            ],
          },
        ],
      },
    ]);
    expect(parsed!.items[0]!.children[0]!.children).toEqual([]);
  });
});

describe("siteMenusNeedDocs", () => {
  it("只有页面动态项时不需要文档数据", () => {
    expect(siteMenusNeedDocs([defaultMainMenu()])).toBe(false);
  });

  it("挂了文档动态项就需要——哪怕是挂在子项里", () => {
    expect(siteMenusNeedDocs([menu([item({ source: "docs" })])])).toBe(true);
    expect(
      siteMenusNeedDocs([
        menu([
          item({
            label: "资源",
            href: "/r",
            children: [item({ id: "c", source: "doc_category" })],
          }),
        ]),
      ]),
    ).toBe(true);
  });
});

/*
 * 「同一个页头在所有页面上长得一样」的守卫。
 *
 * 闸门漏一种情况，后果就是页头在文档页有、在别的页上没有——而文档页恰好总是带着
 * 文档数据，本地随手一看还挺正常。拆成两档是因为两者的数据需求差着量级：菜单要
 * 逐篇的标题地址，搜索框只要一个布尔值。
 */
describe("chrome 的文档数据需求", () => {
  function header(settings: Record<string, unknown>): SiteSection {
    const section = createSection("header");
    return {
      ...section,
      settings: parseSettingValues(getSectionDefinition("header").settings, {
        ...section.settings,
        ...settings,
      }),
    };
  }

  const plain = {
    header: [header({ show_doc_search: false })],
    footer: [],
    menus: [defaultMainMenu()],
  };

  it("什么都没用到文档时两档都不要", () => {
    expect(chromeNeedsDocList(plain)).toBe(false);
    expect(chromeShowsDocSearch(plain)).toBe(false);
  });

  it("菜单里挂了文档动态项要整份目录", () => {
    expect(
      chromeNeedsDocList({ ...plain, menus: [menu([item({ source: "docs" })])] }),
    ).toBe(true);
  });

  it("页脚摆了 doc-* 段要整份目录", () => {
    expect(
      chromeNeedsDocList({ ...plain, footer: [createSection("doc-nav")] }),
    ).toBe(true);
  });

  /*
   * 搜索框**只**要一个布尔值。把它算进 needsDocList 的话，由于它默认是开的，
   * 每一个页面请求都会为一枚按钮拉一遍全库目录。
   */
  it("页头搜索只要「有没有文档」，不要整份目录", () => {
    const withSearch = { ...plain, header: [header({ show_doc_search: true })] };
    expect(chromeShowsDocSearch(withSearch)).toBe(true);
    expect(chromeNeedsDocList(withSearch)).toBe(false);
  });

  it("默认页头就带搜索——它是文档搜索的唯一入口", () => {
    expect(chromeShowsDocSearch({ header: [header({})] })).toBe(true);
  });
});
