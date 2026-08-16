import { filterProductsByCollectionSlug } from "../collection.js";
import { readShopContext } from "../shop-section-context.js";
import { productGridBodyHtml } from "./product-grid-html.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  type SettingValues,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

import type { ShopCollectionDetailView } from "../shop-section-context.js";

/**
 * 当前分类的名称与简介。
 *
 * 结构与 `sectionHeading()` 一致（`.sec-head` / `h2` / `.lead`），分类页的标题
 * 因此和站上别的段一个样式——差别只在文案来自数据，不是租户填在段设置里的一句话。
 */
function collectionHeadHtml(
  collection: ShopCollectionDetailView | null,
  s: SettingValues,
): string {
  if (!collection) return "";
  const title = settingBool(s, "show_title") ? collection.title : "";
  const description = settingBool(s, "show_description")
    ? collection.description
    : "";
  if (!title && !description) return "";
  return `<div class="sec-head">
  <div>
    ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
    ${description ? `<p class="lead">${escapeHtml(description)}</p>` : ""}
  </div>
</div>`;
}

/**
 * 当前分类下的已发布商品。
 *
 * 没有当前分类（分类不存在的 404 版式）就走空态，而不是像通用商品列表那样退回
 * 「全部在售」——这一段的意思只有「这个分类里的商品」这一层。
 */
export const renderCollectionProductsHtml: SectionHtmlRenderer = (
  section,
  ctx,
) => {
  const shop = readShopContext(ctx);
  if (!shop) return "";
  const s = section.settings;
  const slug = shop.collection_slug?.trim() ?? "";
  const products = slug
    ? filterProductsByCollectionSlug(shop.products, slug)
    : [];
  return `${collectionHeadHtml(shop.collection, s)}${productGridBodyHtml(products, s, ctx)}`;
};
