/**
 * 商品列表段 —— 目录页的必备段，也能摆上首页当「在售商品」。
 *
 * 条目来自已发布商品。`collection_slug` 只出该分类；空则全部在售。
 * `limit` 让首页只露几件，目录模板页把 limit 留 0（全部）。
 *
 * 展示那几项（样式 / 价格 / 条数 / 空态 / 栅格）由 `productGridSettings()` 出，
 * 分类页那段（`shop.collection-products`）共用同一份——两处画的是同一种网格，
 * 设置多一项少一项都会让租户在两张页面上看到两套不一样的「商品列表」。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";

import {
  columnsSetting,
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SettingDef } from "@rewindom/builtin/marketing/shared/section-settings.js";
import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const SHOP_PRODUCT_GRID_SECTION_TYPE = "shop.product-grid";

/**
 * 商品网格两段共用的设置流。
 *
 * `collection_slug` 只有通用那段有：它能摆在任意页面上，得说清楚出哪一类货；
 * 分类页那段跟着地址走，给个手填框只会让一张模板页对所有分类出同一批商品。
 */
export function productGridSettings(input: {
  /** 空状态默认文案的 i18n key：目录页说的是「没有在售商品」，分类页是「这个分类还没有商品」。 */
  empty_text: string;
  /**
   * 手填的区块标题 / 副标题。
   *
   * 分类页那段关掉：一张模板页服务所有分类，写死一句「分类」对每个分类都不对；
   * 那边的标题与简介直接来自当前分类的数据（开关在段自己的「分类信息」里）。
   */
  heading?: boolean;
  collection_slug?: boolean;
}): SettingDef[] {
  return [
    ...(input.heading === false ? [] : headingSettings()),
    { type: "header", content: "shop:section.productGrid.display" },
    {
      type: "select",
      id: "style",
      label: "shop:section.productGrid.style",
      default: "cards",
      options: [
        { value: "cards", label: "shop:section.productGrid.styleCards" },
        { value: "list", label: "shop:section.productGrid.styleList" },
      ],
    },
    {
      type: "checkbox",
      id: "show_price",
      label: "shop:section.productGrid.showPrice",
      default: true,
    },
    ...(input.collection_slug
      ? ([
          {
            type: "text",
            id: "collection_slug",
            label: "shop:section.productGrid.collectionSlug",
            default: "",
            info: "shop:section.productGrid.collectionSlugInfo",
          },
        ] as SettingDef[])
      : []),
    {
      type: "range",
      id: "limit",
      label: "shop:section.productGrid.limit",
      min: 0,
      max: 24,
      step: 1,
      default: 0,
      info: "shop:section.productGrid.limitInfo",
    },
    {
      type: "text",
      id: "empty_text",
      label: "shop:section.productGrid.emptyText",
      default: input.empty_text,
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    columnsSetting(4, 3),
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ];
}

export const productGridSection: SectionDefinition = {
  type: SHOP_PRODUCT_GRID_SECTION_TYPE,
  label: "shop:section.productGrid.label",
  placements: ["page"],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: productGridSettings({
    empty_text: "shop:storefront.catalog.empty",
    collection_slug: true,
  }),
};
