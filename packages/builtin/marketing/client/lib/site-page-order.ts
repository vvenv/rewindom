import { isTemplatePageKind } from "../../shared/page-templates.js";
import { type MarketingPageListItem } from "../../shared/site-cms.js";

import type { SitePageGroup } from "./site-page-groups.js";

/** 一次重排要写回的 `sort_order`（对应 `PUT /api/site/pages/order`）。 */
export interface SitePageOrderWrite {
  id: string;
  sort_order: number;
}

/**
 * 把翻译组挪到相邻位置，算出要写回的 `sort_order`。
 *
 * 排序的单位是**翻译组**而不是单页：一个逻辑 URL 的各语言版本在导航里是同一个位置，
 * 分开排只会排出「中文的关于在第 2、英文的关于在第 5」这种没有意义的状态。所以同组
 * 各页拿同一个 `sort_order`（公开面按语言过滤，同值不会撞在一起）。
 *
 * 落值一律是**重编号**（0、1、2…）而不是「和邻居换个值」：存量页面的 `sort_order`
 * 全是建页时的默认 0，换值等于什么都没换（服务端那时按 title 兜底排序，看起来就是
 * 「点了上移没反应」）。重编号顺带把这批页面从「全 0」修好。
 *
 * 只返回**真的变了**的那些页：全 0 的站点第一次排序会写满一批，之后每次通常只有两三条。
 */
export function moveSitePageGroup(
  groups: readonly SitePageGroup[],
  fromIndex: number,
  direction: -1 | 1,
): SitePageOrderWrite[] {
  const toIndex = fromIndex + direction;
  if (
    fromIndex < 0 ||
    fromIndex >= groups.length ||
    toIndex < 0 ||
    toIndex >= groups.length
  ) {
    return [];
  }

  const next = [...groups];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);

  const writes: SitePageOrderWrite[] = [];
  next.forEach((group, index) => {
    for (const page of group.pages) {
      if (page.sort_order !== index) {
        writes.push({ id: page.id, sort_order: index });
      }
    }
  });
  return writes;
}

/**
 * 组能不能再往那个方向挪。
 *
 * 首 / 末位的按钮要禁用而不是消失——一行的操作数忽多忽少，眼睛得重新找「删除」在哪。
 */
export function canMoveSitePageGroup(
  groups: readonly SitePageGroup[],
  index: number,
  direction: -1 | 1,
): boolean {
  const target = index + direction;
  return groups.length > 1 && target >= 0 && target < groups.length;
}

/**
 * 页面清单的概览计数（卡头那行）。
 *
 * 按**页**算而不是按翻译组：「3 个页面」里有两个是同一篇的译文时，说 2 组反而对不上
 * 用户在列表里数出来的行数。模板页不计——它们在下方常驻区，算进来会把「已发布」
 * 这个数字和租户自己建的页面混在一起。
 */
export interface SitePageSummary {
  total: number;
  published: number;
  dirty: number;
}

export function summarizeSitePages(
  pages: readonly MarketingPageListItem[],
): SitePageSummary {
  let total = 0;
  let published = 0;
  let dirty = 0;
  for (const page of pages) {
    if (isTemplatePageKind(page.kind)) continue;
    total += 1;
    if (page.status === "published") published += 1;
    if (page.status === "published" && page.content_dirty) dirty += 1;
  }
  return { total, published, dirty };
}
