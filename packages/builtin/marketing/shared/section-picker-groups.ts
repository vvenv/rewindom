/**
 * 编辑器「添加区块」菜单的分组。
 *
 * 模板页已经按 `group` 分过（同一 key = 同一组）。段这边以前是扁表，
 * marketing 的 Hero 和 events 的 Hero、两套订阅入口会排在一起。
 * 分组身份是 i18n key，不是碰巧相同的文案。
 */

import { getSectionDefinition } from "./sections/index.js";
import {
  MARKETING_CHROME_GROUP,
  MARKETING_SECTION_GROUP,
  type BlockDefinition,
} from "./sections/types.js";

export interface PickerGroup<T> {
  group: string;
  items: T[];
}

export function groupByPickerKey<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
): PickerGroup<T>[] {
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
      continue;
    }
    map.set(key, [item]);
    order.push(key);
  }
  return order.map((group) => ({ group, items: map.get(group) ?? [] }));
}

/** 一段在添加菜单里进哪一组。认不出的 type 按前缀兜底，树上仍要画得出来。 */
export function sectionPickerGroup(type: string): string {
  const declared = getSectionDefinition(type)?.group;
  if (declared) return declared;
  const dot = type.indexOf(".");
  if (dot === -1) return MARKETING_SECTION_GROUP;
  return `${type.slice(0, dot)}:section.group`;
}

/**
 * 一个 chrome / 子项 block 在添加菜单里进哪一组。
 *
 * 不声明 `group` 时：内置 `chrome_*` 自己一组；带模块前缀的贡献块
 *（`shop.cart-link`）进 `{prefix}:section.group`，与该模块的段排在一起。
 */
export function blockPickerGroup(definition: BlockDefinition): string {
  if (definition.group) return definition.group;
  if (definition.type.startsWith("chrome_")) return MARKETING_CHROME_GROUP;
  const dot = definition.type.indexOf(".");
  if (dot === -1) return MARKETING_CHROME_GROUP;
  return `${definition.type.slice(0, dot)}:section.group`;
}
