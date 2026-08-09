/**
 * 菜单编辑的纯函数层。
 *
 * 与控件分开，是因为这里的规则都不是「改一个字段」那么直白：移动要同时认一级项和
 * 子项、换来源要清掉上一种来源的残值、删菜单要把指着它的字段接回主导航。这些都是
 * 不可变数组变换，摊在这儿能直接对着断言写测试；留在组件里就只能靠渲染一遍再点一下。
 */

import {
  createMenuItemId,
  menuKeyFromTitle,
  type SiteMenu,
  type SiteMenuItem,
  type SiteMenuSource,
} from "../../shared/site-menu.js";

/** 新条目一律从「一条空链接」起步——它是唯一需要租户接着填东西的来源。 */
export function blankMenuItem(): SiteMenuItem {
  return {
    id: createMenuItemId(),
    source: "link",
    label: "",
    href: "",
    category: "",
    expand: "children",
    children: [],
  };
}

/* -------------------------------------------------------------------------- */
/* 菜单表                                                                      */
/* -------------------------------------------------------------------------- */

export function updateMenu(
  menus: readonly SiteMenu[],
  key: string,
  update: (menu: SiteMenu) => SiteMenu,
): SiteMenu[] {
  return menus.map((menu) => (menu.key === key ? update(menu) : menu));
}

/** 新建一个菜单，返回新表与它的 key——调用方要把当前字段指过去。 */
export function addMenu(
  menus: readonly SiteMenu[],
  title: string,
): { menus: SiteMenu[]; key: string } {
  const key = menuKeyFromTitle(
    title,
    menus.map((menu) => menu.key),
  );
  return { menus: [...menus, { key, title, items: [] }], key };
}

export function removeMenu(
  menus: readonly SiteMenu[],
  key: string,
): SiteMenu[] {
  return menus.filter((menu) => menu.key !== key);
}

/* -------------------------------------------------------------------------- */
/* 条目                                                                        */
/* -------------------------------------------------------------------------- */

/** 追加一条；`parentId` 非空则挂到那一项下面（只允许一层，见 `SiteMenuItem.children`）。 */
export function addMenuItem(
  menu: SiteMenu,
  parentId: string | null,
): { menu: SiteMenu; id: string } {
  const item = blankMenuItem();
  if (!parentId) {
    return { menu: { ...menu, items: [...menu.items, item] }, id: item.id };
  }
  return {
    menu: {
      ...menu,
      items: menu.items.map((parent) =>
        parent.id === parentId
          ? { ...parent, children: [...parent.children, item] }
          : parent,
      ),
    },
    id: item.id,
  };
}

/** 改一条的字段；一级项和子项同一套写法，调用方不必知道它在哪一层。 */
export function patchMenuItem(
  menu: SiteMenu,
  id: string,
  patch: Partial<SiteMenuItem>,
): SiteMenu {
  return {
    ...menu,
    items: menu.items.map((item) =>
      item.id === id
        ? { ...item, ...patch }
        : {
            ...item,
            children: item.children.map((child) =>
              child.id === id ? { ...child, ...patch } : child,
            ),
          },
    ),
  };
}

export function removeMenuItem(menu: SiteMenu, id: string): SiteMenu {
  return {
    ...menu,
    items: menu.items
      .filter((item) => item.id !== id)
      .map((item) => ({
        ...item,
        children: item.children.filter((child) => child.id !== id),
      })),
  };
}

/** 拖放落点：放在目标行之前还是之后。 */
export type MenuDropPlace = "before" | "after";

function reorderList<T extends { id: string }>(
  items: readonly T[],
  sourceId: string,
  targetId: string,
  place: MenuDropPlace,
): readonly T[] {
  if (sourceId === targetId) return items;
  const from = items.findIndex((item) => item.id === sourceId);
  if (from < 0 || !items.some((item) => item.id === targetId)) return items;
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  if (!item) return items;
  const target = copy.findIndex((entry) => entry.id === targetId);
  copy.splice(place === "after" ? target + 1 : target, 0, item);
  return copy;
}

function swapped<T>(list: readonly T[], index: number, delta: number): T[] | null {
  const target = index + delta;
  if (target < 0 || target >= list.length) return null;
  const next = [...list];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

/**
 * 上/下移一条，**在它自己那一层里**。
 *
 * 子项照样能移：以前只有一级项有上下按钮，一个「文档」下挂三条分类的租户想调整
 * 它们的先后顺序，只能删掉重加——顺序是导航的一半意义，不该有一层是死的。
 * 移到头就原样返回（调用方也据此禁用按钮），不做跨层搬运：从子项跳到一级项是
 * 「改结构」，得是一个说得出名字的动作，不该由一次多按的上移悄悄发生。
 */
export function moveMenuItem(
  menu: SiteMenu,
  id: string,
  delta: number,
): SiteMenu {
  const index = menu.items.findIndex((item) => item.id === id);
  if (index >= 0) {
    const items = swapped(menu.items, index, delta);
    return items ? { ...menu, items } : menu;
  }
  return {
    ...menu,
    items: menu.items.map((parent) => {
      const childIndex = parent.children.findIndex((child) => child.id === id);
      if (childIndex < 0) return parent;
      const children = swapped(parent.children, childIndex, delta);
      return children ? { ...parent, children } : parent;
    }),
  };
}

/**
 * 拖放换位：只在**同一层**的 `items` / `children` 里挪动。
 *
 * 跨层（子项拖到一级、或一级拖进某个父项下）原样返回——那是改结构，不是排序。
 */
export function reorderMenuItem(
  menu: SiteMenu,
  sourceId: string,
  targetId: string,
  place: MenuDropPlace,
): SiteMenu {
  const topIndex = menu.items.findIndex((item) => item.id === sourceId);
  if (topIndex >= 0) {
    const items = reorderList(menu.items, sourceId, targetId, place);
    return items === menu.items ? menu : { ...menu, items: [...items] };
  }
  return {
    ...menu,
    items: menu.items.map((parent) => {
      const childIndex = parent.children.findIndex(
        (child) => child.id === sourceId,
      );
      if (childIndex < 0) return parent;
      const children = reorderList(parent.children, sourceId, targetId, place);
      return children === parent.children
        ? parent
        : { ...parent, children: [...children] };
    }),
  };
}

/**
 * 换来源时要一起写进去的补丁。
 *
 * 清掉上一种来源专属的字段：留着的话，一条从 `doc_category` 改回 `link` 的条目会
 * 带着一个看不见的 `category` 存进库里，下次谁读到都得先判断它算不算数。
 */
export function menuItemSourcePatch(
  source: SiteMenuSource,
): Partial<SiteMenuItem> {
  return {
    source,
    ...(source === "link" ? {} : { href: "", children: [] }),
    ...(source === "doc_category" ? {} : { category: "" }),
  };
}
