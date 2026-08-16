import { beforeAll, describe, expect, it } from "vitest";

import { cartSection } from "./cart-section.js";
import { checkoutSection } from "./checkout-section.js";
import { collectionListSection } from "./collection-list-section.js";
import { collectionProductsSection } from "./collection-products-section.js";
import { orderListSection, orderSection } from "./order-section.js";
import { productGridSection } from "./product-grid-section.js";
import { productSection } from "./product-section.js";
import {
  registerShopPageTemplates,
  SHOP_COLLECTION_TEMPLATE_PRESET,
  SHOP_INDEX_PAGE_KIND,
  SHOP_PAGE_TEMPLATE_GROUP,
} from "./shop-page-templates.js";

import {
  getPageTemplateKind,
  listPageTemplateKinds,
} from "@rewindom/builtin/marketing/shared/page-templates.js";

describe("registerShopPageTemplates", () => {
  beforeAll(() => {
    registerShopPageTemplates();
  });

  it("登记商店分组下的目录 / 详情 / 购物车 / 结账 / 订单确认", () => {
    const kinds = listPageTemplateKinds().filter(
      (item) => item.group === SHOP_PAGE_TEMPLATE_GROUP,
    );
    expect(kinds.map((item) => item.kind)).toEqual([
      "shop_index",
      "shop_product",
      "shop_collection",
      "shop_cart",
      "shop_checkout",
      "shop_order",
    ]);
    for (const item of kinds) {
      expect(item.entitlement).toBe("shop");
      expect(item.required_section).toBeTruthy();
    }
  });

  it("把「我的订单」挂进会员页那一组", () => {
    const memberOrders = getPageTemplateKind("shop_member_orders");
    expect(memberOrders?.path).toBe("/member/orders");
    expect(memberOrders?.entitlement).toBe("shop");
    expect(memberOrders?.required_section).toBe("shop.order-list");
  });

  it("必备段 type 带 shop. 前缀并声明 entitlement", () => {
    expect(productGridSection.type).toBe("shop.product-grid");
    expect(collectionListSection.type).toBe("shop.collection-list");
    expect(collectionProductsSection.type).toBe("shop.collection-products");
    expect(productSection.type).toBe("shop.product");
    expect(cartSection.type).toBe("shop.cart");
    expect(checkoutSection.type).toBe("shop.checkout");
    expect(orderSection.type).toBe("shop.order");
    expect(orderListSection.type).toBe("shop.order-list");
    expect(productGridSection.entitlement).toBe("shop");
    expect(collectionListSection.entitlement).toBe("shop");
    expect(productSection.page_kinds).toEqual(["shop_product"]);
    expect(checkoutSection.blocks?.map((block) => block.type)).toEqual([
      "contact",
      "address",
      "shipping",
      "note",
      "summary",
      "pay",
    ]);
  });

  it("分类页的必备段是分类商品列表，且这一段只能落在分类页上", () => {
    expect(getPageTemplateKind("shop_collection")?.required_section).toBe(
      "shop.collection-products",
    );
    expect(SHOP_COLLECTION_TEMPLATE_PRESET.sections.map((s) => s.type)).toEqual([
      "shop.collection-products",
    ]);
    expect(collectionProductsSection.page_kinds).toEqual(["shop_collection"]);
    expect(collectionProductsSection.entitlement).toBe("shop");
    /* 通用商品列表摆哪儿都行，不该被钉住——分类页上仍可另加一段「本季新品」。 */
    expect(productGridSection.page_kinds).toBeUndefined();
  });

  it("目录模板指向 /shop", () => {
    expect(getPageTemplateKind(SHOP_INDEX_PAGE_KIND)?.path).toBe("/shop");
  });

  it("同一进程再登记一次不抛", () => {
    expect(() => registerShopPageTemplates()).not.toThrow();
  });
});
