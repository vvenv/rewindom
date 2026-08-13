import { describe, expect, it } from "vitest";

import type { ShopCartItemView } from "../../shared/index.js";
import {
  STRIPE_TAX_CODE_NONTAXABLE,
  buildShopCheckoutSessionParams,
  shopCheckoutLineItems,
  shopCheckoutShippingOptions,
  stripeAddressFromShop,
} from "./checkout-session.js";

function item(
  overrides: Partial<ShopCartItemView> = {},
): ShopCartItemView {
  return {
    id: "ci_1",
    variant_id: "var_1",
    product_id: "prod_1",
    product_slug: "mug",
    title: "Mug",
    sku: "MUG-1",
    image_url: null,
    quantity: 2,
    unit_price_cents: 1200,
    currency: "USD",
    stock_qty: 10,
    track_inventory: true,
    inventory_policy: "deny",
    requires_shipping: true,
    taxable: true,
    line_total_cents: 2400,
    ...overrides,
  };
}

describe("shopCheckoutLineItems", () => {
  it("sends one Stripe line per SKU at unit price", () => {
    const lines = shopCheckoutLineItems([item()], "USD");
    expect(lines).toEqual([
      {
        quantity: 2,
        price_data: {
          currency: "usd",
          unit_amount: 1200,
          product_data: {
            name: "Mug",
            tax_code: undefined,
            metadata: { variant_id: "var_1", sku: "MUG-1" },
          },
        },
      },
    ]);
  });

  it("marks nontaxable SKUs with Stripe's nontaxable tax code", () => {
    const lines = shopCheckoutLineItems([item({ taxable: false })], "EUR");
    expect(lines[0]?.price_data?.product_data?.tax_code).toBe(
      STRIPE_TAX_CODE_NONTAXABLE,
    );
    expect(lines[0]?.price_data?.currency).toBe("eur");
  });
});

describe("shopCheckoutShippingOptions", () => {
  it("omits shipping when the cart is digital-only", () => {
    expect(shopCheckoutShippingOptions("USD", 0, null)).toBeUndefined();
  });

  it("passes a fixed shipping rate so Stripe Tax can tax freight", () => {
    expect(shopCheckoutShippingOptions("USD", 499, "DHL")).toEqual([
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: "DHL",
          fixed_amount: { amount: 499, currency: "usd" },
        },
      },
    ]);
  });
});

describe("buildShopCheckoutSessionParams", () => {
  it("does not set payment_method_types", () => {
    const params = buildShopCheckoutSessionParams({
      origin: "http://localhost:7300",
      email: "buyer@example.com",
      order_id: "ord_1",
      order_number: "S1",
      tenant_id: "ten_1",
      cart_id: "cart_1",
      currency: "USD",
      items: [item()],
      shipping_cents: 499,
      shipping_name: "DHL",
      automatic_tax: true,
      coupon_id: "co_1",
      customer_id: "cus_1",
    });
    expect(params).not.toHaveProperty("payment_method_types");
    expect(params.mode).toBe("payment");
    expect(params.customer).toBe("cus_1");
    expect(params.customer_email).toBeUndefined();
    expect(params.automatic_tax).toEqual({ enabled: true });
    expect(params.discounts).toEqual([{ coupon: "co_1" }]);
    expect(params.tax_id_collection).toEqual({ enabled: true });
    expect(params.metadata).toEqual({
      tenant_id: "ten_1",
      order_id: "ord_1",
      order_number: "S1",
      cart_id: "cart_1",
    });
  });
});

describe("stripeAddressFromShop", () => {
  it("drops empty optional fields", () => {
    expect(
      stripeAddressFromShop({
        name: "Ada",
        line1: "1 Main",
        line2: "",
        city: "Austin",
        postal_code: "78701",
        country: "US",
      }),
    ).toEqual({
      line1: "1 Main",
      line2: undefined,
      city: "Austin",
      state: undefined,
      postal_code: "78701",
      country: "US",
    });
  });
});
