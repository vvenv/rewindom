import {
  sortDocCategories,
  type MarketingDocCategory,
} from "../../shared/marketing-doc-category.js";

export interface DocCategoryOrderWrite {
  id: string;
  sort_order: number;
}

/**
 * 把分类挪到相邻位置，算出要写回的 `sort_order`。
 *
 * 与页面排序同口径：重编号为 0、1、2…，避免存量全是 0 时「和邻居换值」无效。
 */
export function moveDocCategory(
  categories: readonly MarketingDocCategory[],
  fromIndex: number,
  direction: -1 | 1,
): DocCategoryOrderWrite[] {
  const sorted = sortDocCategories(categories);
  const toIndex = fromIndex + direction;
  if (
    fromIndex < 0 ||
    fromIndex >= sorted.length ||
    toIndex < 0 ||
    toIndex >= sorted.length
  ) {
    return [];
  }

  const next = [...sorted];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);

  const writes: DocCategoryOrderWrite[] = [];
  next.forEach((category, index) => {
    if (category.sort_order !== index) {
      writes.push({ id: category.id, sort_order: index });
    }
  });
  return writes;
}

export function canMoveDocCategory(
  categories: readonly MarketingDocCategory[],
  index: number,
  direction: -1 | 1,
): boolean {
  const sorted = sortDocCategories(categories);
  const target = index + direction;
  return sorted.length > 1 && target >= 0 && target < sorted.length;
}
