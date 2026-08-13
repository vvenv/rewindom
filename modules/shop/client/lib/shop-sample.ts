import type { ShopRenderContext } from "../../shared/shop-section-context.js";
import { emptyShopContext } from "../../shared/shop-section-context.js";

/** 编辑器预览用的占位数据：访客看到的是真实目录 / 购物车。 */
export function sampleShopContext(): ShopRenderContext {
  return emptyShopContext({
    products: [
      {
        slug: "sample",
        href: "/shop/sample",
        title: "Sample product",
        price: "$12.00",
      },
    ],
    product: {
      title: "Sample product",
      description: "Placeholder used in the editor.",
      variants: [
        { id: "v1", label: "Default", price: "$12.00", stock: 8 },
      ],
    },
    cart: {
      item_count: 1,
      subtotal: "$12.00",
      items: [
        {
          id: "line-1",
          title: "Sample product",
          sku: "SKU-001",
          quantity: 1,
          line_total: "$12.00",
        },
      ],
    },
    checkout: {
      email: "buyer@example.com",
      canceled: false,
      rates: [{ id: "rate-1", label: "Standard", price: "$5.00" }],
      values: {
        email: "buyer@example.com",
        name: "",
        line1: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        phone: "",
        shipping_rate_id: "rate-1",
      },
    },
    order: {
      number: "1001",
      status: "paid",
      pending: false,
      subtotal: "$12.00",
      shipping: "$5.00",
      tax: "$0.00",
      total: "$17.00",
      lines: [{ title: "Sample product", quantity: 1, line_total: "$12.00" }],
      shipments: [],
    },
    orders: [
      {
        number: "1001",
        href: "/shop/orders/1001",
        status: "paid",
        total: "$17.00",
      },
    ],
  });
}
