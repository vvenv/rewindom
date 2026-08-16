/**
 * 分类商品列表段 —— `/shop/collections/:slug` 模板页的必备段。
 *
 * 与通用「商品列表」画的是同一种网格，差别只在条目从哪儿来：这一段永远跟着
 * **当前地址上的分类**走（`shop.collection_slug`，由 SSR 按 slug 填），编辑器里
 * 因此没有「分类路径」可填——一张模板页要服务所有分类，写死一个 slug 会让别的
 * 分类页出错货。`page_kinds` 把它钉在分类页上：摆到首页上没有「当前分类」可言。
 *
 * 标题同理：这里没有手填的区块标题 / 副标题，画的是**当前分类自己的**名称与简介
 * （`shop.collection`），租户只配「显不显示」。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";
import { productGridSettings } from "./product-grid-section.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const SHOP_COLLECTION_PRODUCTS_SECTION_TYPE = "shop.collection-products";
export const SHOP_COLLECTION_PAGE_KIND = "shop_collection";

export const collectionProductsSection: SectionDefinition = {
  type: SHOP_COLLECTION_PRODUCTS_SECTION_TYPE,
  label: "shop:section.collectionProducts.label",
  placements: ["page"],
  page_kinds: [SHOP_COLLECTION_PAGE_KIND],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: [
    /*
     * 分类信息取自**当前分类**，不是手填框：模板页服务所有分类，能填的只有
     * 「显不显示」。名称退回 slug，简介没填就整段不出——空标题不占位。
     */
    { type: "header", content: "shop:section.collectionProducts.info" },
    {
      type: "checkbox",
      id: "show_title",
      label: "shop:section.collectionProducts.showTitle",
      default: true,
      info: "shop:section.collectionProducts.showTitleInfo",
    },
    {
      type: "checkbox",
      id: "show_description",
      label: "shop:section.collectionProducts.showDescription",
      default: true,
      info: "shop:section.collectionProducts.showDescriptionInfo",
    },
    ...productGridSettings({
      empty_text: "shop:storefront.collection.empty",
      heading: false,
    }),
  ],
};
