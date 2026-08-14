import { beforeAll, describe, expect, it } from "vitest";

import { registerShopStorefrontSections } from "./register.js";
import { productGridSection } from "../../shared/product-grid-section.js";
import { productSection } from "../../shared/product-section.js";
import { cartSection, SHOP_CART_LINK_BLOCK_TYPE } from "../../shared/cart-section.js";
import { checkoutSection } from "../../shared/checkout-section.js";
import { orderSection } from "../../shared/order-section.js";
import {
  emptyShopContext,
  shopContextEntry,
} from "../../shared/shop-section-context.js";

import { createBlock, createSection } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { renderHeaderHtml } from "@rewindom/builtin/marketing/shared/sections/header/html.js";
import { SECTION_HTML } from "@rewindom/builtin/marketing/shared/sections/html.js";

describe("shop storefront section html", () => {
  beforeAll(() => {
    registerShopStorefrontSections();
  });

  it("商品列表在有商品时输出卡片链接", () => {
    const section = createSection(productGridSection.type);
    const html = SECTION_HTML[productGridSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          products: [
            { slug: "mug", href: "/shop/mug", title: "Mug", price: "$12.00", compare_at_price: null, image_url: null, image_alt: "", collection_slugs: [] },
          ],
        }),
      ),
    });
    expect(html).toContain("/shop/mug");
    expect(html).toContain("Mug");
    expect(html).toContain("$12.00");
    expect(html).toContain("shop-card");
    expect(html).toContain("shop-card-media");
    expect(html).toContain("shop-card-body");
  });

  it("商品详情把 description 当 Markdown 渲染，而不是纯文本转义", () => {
    const section = createSection(productSection.type);
    const html = SECTION_HTML[productSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          product: {
            title: "Mug",
            subtitle: "",
            description: "A **ceramic** mug.\n\n- dishwasher safe",
            images: [],
            variants: [
              {
                id: "v1",
                label: "Default",
                price: "$12.00",
                compare_at_price: null,
                stock: 4,
                sold_out: false,
              },
            ],
          },
        }),
      ),
    });
    expect(html).toContain("shop-product-description prose");
    expect(html).toContain("<strong>ceramic</strong>");
    expect(html).toContain("<li>");
    expect(html).toContain("dishwasher safe");
    expect(html).not.toContain("**ceramic**");
  });

  it("多图商品用 radio 切换主图，无需脚本", () => {
    const section = createSection(productSection.type);
    const html = SECTION_HTML[productSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          product: {
            title: "Mug",
            subtitle: "",
            description: "",
            images: [
              { url: "/mug.jpg", alt: "A mug" },
              { url: "/mug-side.jpg", alt: "Side" },
            ],
            variants: [
              {
                id: "v1",
                label: "Default",
                price: "$12.00",
                compare_at_price: null,
                stock: 4,
                sold_out: false,
              },
            ],
          },
        }),
      ),
    });
    expect(html).toContain('type="radio" name="shop-gallery"');
    expect(html).toContain("shop-gallery-thumbs");
    expect(html).toContain('for="shop-g-1"');
  });

  it("购物车行项目不再用 float 图 + 表格", () => {
    const section = createSection(cartSection.type);
    const html = SECTION_HTML[cartSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          cart: {
            item_count: 1,
            subtotal: "$20.00",
            discount_code: null,
            discount: null,
            items: [
              {
                id: "l1",
                title: "Mug",
                sku: "MUG",
                image_url: "/mug.jpg",
                quantity: 2,
                line_total: "$20.00",
              },
            ],
          },
        }),
      ),
    });
    expect(html).toContain("shop-cart");
    expect(html).toContain("shop-line");
    expect(html).toContain("shop-line-media");
    expect(html).not.toContain("shop-table");
    expect(html).not.toContain("shop-line-image");
  });

  it("商品详情输出图库与划线原价", () => {
    const section = createSection(productSection.type);
    const html = SECTION_HTML[productSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          product: {
            title: "Mug",
            subtitle: "Ceramic",
            description: "",
            images: [{ url: "/mug.jpg", alt: "A mug" }],
            variants: [
              {
                id: "v1",
                label: "Default",
                price: "$12.00",
                compare_at_price: "$15.00",
                stock: 4,
                sold_out: false,
              },
            ],
          },
        }),
      ),
    });
    expect(html).toContain('src="/mug.jpg"');
    expect(html).toContain("shop-gallery");
    expect(html).toContain("shop-gallery-stage");
    expect(html).toContain("shop-price-compare");
    expect(html).toContain("$15.00");
    expect(html).toContain("Ceramic");
  });

  it("结账段是一张包含收件地址与付款按钮的 form", () => {
    const section = createSection(checkoutSection.type);
    const html = SECTION_HTML[checkoutSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          checkout: {
            email: "a@b.c",
            canceled: false,
            requires_shipping: true,
            rates: [{ id: "r1", label: "Standard", price: "$5.00" }],
            values: {
              email: "a@b.c",
              name: "",
              line1: "",
              city: "",
              state: "",
              postal_code: "",
              country: "",
              phone: "",
              shipping_rate_id: "r1",
              note: "",
            },
          },
        }),
      ),
    });
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/shop/checkout"');
    expect(html).toContain('name="line1"');
    expect(html).toContain('name="shipping_rate_id"');
    expect(html).toContain('name="note"');
    expect(html).toContain('type="submit"');
  });

  it("商品列表按请求上的 collection_slug 过滤（分类页）", () => {
    const section = createSection(productGridSection.type);
    const html = SECTION_HTML[productGridSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          collection_slug: "summer",
          products: [
            {
              slug: "mug",
              href: "/shop/mug",
              title: "Mug",
              price: "$12.00",
              compare_at_price: null,
              image_url: null,
              image_alt: "",
              collection_slugs: ["summer"],
            },
            {
              slug: "lamp",
              href: "/shop/lamp",
              title: "Lamp",
              price: "$40.00",
              compare_at_price: null,
              image_url: null,
              image_alt: "",
              collection_slugs: ["home"],
            },
          ],
        }),
      ),
    });
    expect(html).toContain("/shop/mug");
    expect(html).not.toContain("/shop/lamp");
  });

  it("商品列表按 collection_slug 过滤卡片", () => {
    const section = createSection(productGridSection.type);
    section.settings.collection_slug = "summer";
    const html = SECTION_HTML[productGridSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          products: [
            {
              slug: "mug",
              href: "/shop/mug",
              title: "Mug",
              price: "$12.00",
              compare_at_price: null,
              image_url: null,
              image_alt: "",
              collection_slugs: ["summer"],
            },
            {
              slug: "lamp",
              href: "/shop/lamp",
              title: "Lamp",
              price: "$40.00",
              compare_at_price: null,
              image_url: null,
              image_alt: "",
              collection_slugs: ["home"],
            },
          ],
        }),
      ),
    });
    expect(html).toContain("/shop/mug");
    expect(html).not.toContain("/shop/lamp");
  });

  it("结账优惠码是付款表单外的独立 POST", () => {
    const section = createSection(checkoutSection.type);
    const html = SECTION_HTML[checkoutSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          cart: {
            item_count: 1,
            subtotal: "$20.00",
            discount_code: "SAVE10",
            discount: "$2.00",
            items: [
              {
                id: "l1",
                title: "Mug",
                sku: "MUG",
                image_url: null,
                quantity: 1,
                line_total: "$20.00",
              },
            ],
          },
          checkout: {
            email: "a@b.c",
            canceled: false,
            requires_shipping: false,
            rates: [],
            values: {
              email: "a@b.c",
              name: "",
              line1: "",
              city: "",
              state: "",
              postal_code: "",
              country: "",
              phone: "",
              shipping_rate_id: "",
              note: "",
            },
          },
        }),
      ),
    });
    expect(html).toContain('name="intent" value="discount"');
    expect(html).toContain("SAVE10");
    const payForm = html?.split('class="shop-checkout-main"')[1]?.split("</form>")[0] ?? "";
    expect(payForm).not.toContain('name="intent" value="discount"');
    const aside = html?.split('class="shop-checkout-aside"')[1] ?? "";
    expect(aside).toContain('name="intent" value="discount"');
  });

  it("购物车摘要输出折扣行与独立优惠码表单", () => {
    const section = createSection(cartSection.type);
    const html = SECTION_HTML[cartSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          cart: {
            item_count: 1,
            subtotal: "$20.00",
            discount_code: "SAVE10",
            discount: "$2.00",
            items: [
              {
                id: "l1",
                title: "Mug",
                sku: "MUG",
                image_url: null,
                quantity: 1,
                line_total: "$20.00",
              },
            ],
          },
        }),
      ),
    });
    expect(html).toContain("SAVE10");
    expect(html).toContain("$2.00");
    expect(html).toContain('name="intent" value="discount"');
    expect(html).toContain('name="code"');
  });

  it("订单确认输出折扣行", () => {
    const section = createSection(orderSection.type);
    const html = SECTION_HTML[orderSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          order: {
            number: "S1",
            status: "paid",
            pending: false,
            note: null,
            subtotal: "$20.00",
            discount_code: "SAVE10",
            discount: "$2.00",
            shipping: "$5.00",
            tax: "$0.00",
            total: "$23.00",
            lines: [{ title: "Mug", quantity: 1, line_total: "$20.00" }],
            shipments: [],
          },
        }),
      ),
    });
    expect(html).toContain("SAVE10");
    expect(html).toContain("$2.00");
  });

  it("页头购物车入口是一枚带件数的按钮", () => {
    const section = createSection("header");
    section.blocks.push(
      createBlock("header", SHOP_CART_LINK_BLOCK_TYPE, {
        label: "Cart",
        show_count: true,
        align: "end",
      }),
    );
    const html = renderHeaderHtml({
      section,
      siteName: "Store",
      logoUrl: null,
      homeHref: "/",
      enabledEntitlements: new Set(["shop"]),
      contributed: shopContextEntry(
        emptyShopContext({
          cart: {
            item_count: 3,
            subtotal: "$12.00",
            discount_code: null,
            discount: null,
            items: [],
          },
        }),
      ),
    });
    expect(html).toContain('class="btn btn-ghost shop-cart-link"');
    expect(html).toContain('href="/shop/cart"');
    expect(html).toContain("shop-cart-count");
    expect(html).toContain(">3<");
    expect(html).not.toContain("<p class=\"shop-cart-link\"");
  });
});
