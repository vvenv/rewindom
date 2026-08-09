/**
 * 导航条目列表的纯函数编辑层（不可变变换，便于单测）。
 */

import {
  blankNavItem,
  createNavItemId,
  navItemSourcePatch,
  type SiteNavItem,
  type SiteNavSource,
} from "../../shared/site-nav.js";

export type NavDropPlace = "before" | "after";

export function addNavItem(
  items: readonly SiteNavItem[],
  source: SiteNavSource = "link",
): { items: SiteNavItem[]; id: string } {
  const item = blankNavItem(source);
  return { items: [...items, item], id: item.id };
}

/** 追加子项时返回子项 id（上面那条在 parent 分支会丢）。 */
export function addNavChild(
  items: readonly SiteNavItem[],
  parentId: string,
): { items: SiteNavItem[]; id: string } {
  const child = blankNavItem("link");
  return {
    items: items.map((parent) =>
      parent.id === parentId
        ? { ...parent, children: [...parent.children, child] }
        : parent,
    ),
    id: child.id,
  };
}

export function patchNavItem(
  items: readonly SiteNavItem[],
  id: string,
  patch: Partial<SiteNavItem>,
): SiteNavItem[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, ...patch }
      : {
          ...item,
          children: item.children.map((child) =>
            child.id === id ? { ...child, ...patch } : child,
          ),
        },
  );
}

export function removeNavItem(
  items: readonly SiteNavItem[],
  id: string,
): SiteNavItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: item.children.filter((child) => child.id !== id),
    }));
}

function reorderList<T extends { id: string }>(
  list: readonly T[],
  sourceId: string,
  targetId: string,
  place: NavDropPlace,
): readonly T[] {
  if (sourceId === targetId) return list;
  const from = list.findIndex((item) => item.id === sourceId);
  if (from < 0 || !list.some((item) => item.id === targetId)) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  if (!item) return list;
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

export function moveNavItem(
  items: readonly SiteNavItem[],
  id: string,
  delta: number,
): SiteNavItem[] {
  const index = items.findIndex((item) => item.id === id);
  if (index >= 0) {
    const next = swapped(items, index, delta);
    return next ?? [...items];
  }
  return items.map((parent) => {
    const childIndex = parent.children.findIndex((child) => child.id === id);
    if (childIndex < 0) return parent;
    const children = swapped(parent.children, childIndex, delta);
    return children ? { ...parent, children } : parent;
  });
}

export function reorderNavItem(
  items: readonly SiteNavItem[],
  sourceId: string,
  targetId: string,
  place: NavDropPlace,
): SiteNavItem[] {
  const topIndex = items.findIndex((item) => item.id === sourceId);
  if (topIndex >= 0) {
    const next = reorderList(items, sourceId, targetId, place);
    return next === items ? [...items] : [...next];
  }
  return items.map((parent) => {
    const childIndex = parent.children.findIndex(
      (child) => child.id === sourceId,
    );
    if (childIndex < 0) return parent;
    const children = reorderList(parent.children, sourceId, targetId, place);
    return children === parent.children
      ? parent
      : { ...parent, children: [...children] };
  });
}

export { createNavItemId, navItemSourcePatch };
export type { SiteNavItem, SiteNavSource };
