import { SHOP_CART_LINK_BLOCK_TYPE } from "./cart-section.js";
import { SHOP_COLLECTION_LIST_SECTION_TYPE } from "./collection-list-section.js";
import { SHOP_COLLECTION_NAV_SOURCE, SHOP_NAV_SOURCE } from "./nav-sources.js";
import { SHOP_PRODUCT_GRID_SECTION_TYPE } from "./product-grid-section.js";
import { SHOP_PROMO_SECTION_TYPE } from "./promo-section.js";

/**
 * 段 / chrome 块 / 导航源：通用 SSR 与编辑器预览按这组 type 按需取店铺数据。
 *
 * 同时是**店面自有 SSR 页的跳过清单**——那几张页手上已经带着完整的购物车、商品与
 * 分类树，再让 provider 查一遍就是每张页多打一轮同样的库（见
 * `marketing/server/page-contributed.ts` 的 `skipSectionTypes`）。
 * 两处共用一份，省得加了新段之后一边记得改、另一边忘了。
 */
export const SHOP_CONTEXT_SECTION_TYPES = [
  SHOP_PRODUCT_GRID_SECTION_TYPE,
  SHOP_COLLECTION_LIST_SECTION_TYPE,
  SHOP_CART_LINK_BLOCK_TYPE,
  SHOP_NAV_SOURCE,
  SHOP_COLLECTION_NAV_SOURCE,
  SHOP_PROMO_SECTION_TYPE,
] as const;
