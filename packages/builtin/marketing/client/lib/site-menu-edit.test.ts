import { describe, expect, it } from "vitest";

import { MAIN_MENU_KEY, type SiteMenu } from "../../shared/site-menu.js";

import {
  addMenu,
  addMenuItem,
  blankMenuItem,
  menuItemSourcePatch,
  moveMenuItem,
  patchMenuItem,
  removeMenu,
  removeMenuItem,
  reorderMenuItem,
  updateMenu,
} from "./site-menu-edit.js";

function menu(): SiteMenu {
  const home = { ...blankMenuItem(), id: "home", label: "首页", href: "/" };
  const docs = {
    ...blankMenuItem(),
    id: "docs",
    label: "文档",
    href: "/docs",
    children: [
      { ...blankMenuItem(), id: "c1", label: "入门" },
      { ...blankMenuItem(), id: "c2", label: "进阶" },
    ],
  };
  const about = { ...blankMenuItem(), id: "about", label: "关于", href: "/about" };
  return { key: MAIN_MENU_KEY, title: "主导航", items: [home, docs, about] };
}

describe("site-menu-edit", () => {
  it("adds items at the top level and under a parent", () => {
    const added = addMenuItem(menu(), null);
    expect(added.menu.items.map((item) => item.id)).toEqual([
      "home",
      "docs",
      "about",
      added.id,
    ]);

    const nested = addMenuItem(menu(), "docs");
    expect(nested.menu.items[1]?.children.map((item) => item.id)).toEqual([
      "c1",
      "c2",
      nested.id,
    ]);
    // 只往指定的父项里加，其余条目原样
    expect(nested.menu.items[0]?.children).toEqual([]);
  });

  it("patches and removes items at either level", () => {
    expect(patchMenuItem(menu(), "c2", { label: "改过" }).items[1]?.children[1])
      .toMatchObject({ id: "c2", label: "改过" });

    const removed = removeMenuItem(menu(), "c1");
    expect(removed.items[1]?.children.map((item) => item.id)).toEqual(["c2"]);
    expect(removed.items.map((item) => item.id)).toEqual([
      "home",
      "docs",
      "about",
    ]);
  });

  it("removing a parent takes its children with it", () => {
    const removed = removeMenuItem(menu(), "docs");
    expect(removed.items.map((item) => item.id)).toEqual(["home", "about"]);
  });

  it("moves top-level items within their own level", () => {
    expect(
      moveMenuItem(menu(), "about", -1).items.map((item) => item.id),
    ).toEqual(["home", "about", "docs"]);
  });

  /** 这一条以前做不到：子项没有排序入口，只能删掉重加。 */
  it("moves children within their parent", () => {
    const moved = moveMenuItem(menu(), "c2", -1);
    expect(moved.items[1]?.children.map((item) => item.id)).toEqual([
      "c2",
      "c1",
    ]);
    // 不冒泡到上一层
    expect(moved.items.map((item) => item.id)).toEqual([
      "home",
      "docs",
      "about",
    ]);
  });

  it("keeps the menu unchanged when a move would fall off either end", () => {
    const source = menu();
    expect(moveMenuItem(source, "home", -1)).toEqual(source);
    expect(moveMenuItem(source, "about", 1)).toEqual(source);
    expect(moveMenuItem(source, "c1", -1)).toEqual(source);
  });

  it("reorders top-level items via drag target", () => {
    expect(
      reorderMenuItem(menu(), "about", "docs", "before").items.map(
        (item) => item.id,
      ),
    ).toEqual(["home", "about", "docs"]);
    expect(
      reorderMenuItem(menu(), "home", "about", "after").items.map(
        (item) => item.id,
      ),
    ).toEqual(["docs", "about", "home"]);
  });

  it("reorders children within their parent via drag target", () => {
    const moved = reorderMenuItem(menu(), "c2", "c1", "before");
    expect(moved.items[1]?.children.map((item) => item.id)).toEqual([
      "c2",
      "c1",
    ]);
    expect(moved.items.map((item) => item.id)).toEqual([
      "home",
      "docs",
      "about",
    ]);
  });

  it("ignores cross-level reorder and source equals target", () => {
    const source = menu();
    expect(reorderMenuItem(source, "c1", "home", "before")).toEqual(source);
    expect(reorderMenuItem(source, "home", "home", "before")).toEqual(source);
  });

  it("clears the fields the previous source owned", () => {
    // 动态项不该带着一个看不见的 href / children 存进库里
    expect(menuItemSourcePatch("docs")).toEqual({
      source: "docs",
      href: "",
      children: [],
      category: "",
    });
    // 回到 link 时清掉分类，但 href / children 归租户自己填
    expect(menuItemSourcePatch("link")).toEqual({
      source: "link",
      category: "",
    });
    expect(menuItemSourcePatch("doc_category")).toEqual({
      source: "doc_category",
      href: "",
      children: [],
    });
  });

  it("derives a fresh key when adding a menu and leaves the rest alone", () => {
    const first = addMenu([menu()], "Footer links");
    expect(first.key).toBe("footer-links");
    expect(first.menus.map((entry) => entry.key)).toEqual([
      MAIN_MENU_KEY,
      "footer-links",
    ]);

    // 重名不覆盖：第二个自动错开
    const second = addMenu(first.menus, "Footer links");
    expect(second.key).toBe("footer-links-2");
  });

  it("updates only the named menu", () => {
    const menus = addMenu([menu()], "Other").menus;
    const next = updateMenu(menus, "other", (entry) => ({
      ...entry,
      title: "改过",
    }));
    expect(next[0]?.title).toBe("主导航");
    expect(next[1]?.title).toBe("改过");
  });

  it("removes a menu by key", () => {
    const menus = addMenu([menu()], "Footer").menus;
    expect(removeMenu(menus, "footer").map((entry) => entry.key)).toEqual([
      MAIN_MENU_KEY,
    ]);
  });
});
