import type Stripe from "stripe";

import type { ShopAddress, ShopCartItemView } from "../../shared/index.js";

/** Stripe Tax code for nontaxable goods. From Stripe's tax code list. */
export const STRIPE_TAX_CODE_NONTAXABLE = "txcd_00000000";

export interface ShopCheckoutSessionInput {
  origin: string;
  email: string;
  order_id: string;
  order_number: string;
  tenant_id: string;
  cart_id: string;
  currency: string;
  items: ShopCartItemView[];
  shipping_cents: number;
  shipping_name: string | null;
  automatic_tax: boolean;
  coupon_id?: string;
  customer_id?: string;
}

export function stripeAddressFromShop(
  address: ShopAddress,
): Stripe.AddressParam {
  return {
    line1: address.line1,
    line2: address.line2 || undefined,
    city: address.city,
    state: address.state || undefined,
    postal_code: address.postal_code,
    country: address.country,
  };
}

export function shopCheckoutLineItems(
  items: ShopCartItemView[],
  currency: string,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: currency.toLowerCase(),
      unit_amount: item.unit_price_cents,
      product_data: {
        name: item.title,
        tax_code: item.taxable ? undefined : STRIPE_TAX_CODE_NONTAXABLE,
        metadata: {
          variant_id: item.variant_id,
          sku: item.sku,
        },
      },
    },
  }));
}

export function shopCheckoutShippingOptions(
  currency: string,
  shipping_cents: number,
  shipping_name: string | null,
): Stripe.Checkout.SessionCreateParams.ShippingOption[] | undefined {
  if (shipping_name == null) return undefined;
  return [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: shipping_name.slice(0, 100) || "Shipping",
        fixed_amount: {
          amount: Math.max(0, shipping_cents),
          currency: currency.toLowerCase(),
        },
      },
    },
  ];
}

export function buildShopCheckoutSessionParams(
  input: ShopCheckoutSessionInput,
): Stripe.Checkout.SessionCreateParams {
  const number = encodeURIComponent(input.order_number);
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    success_url: `${input.origin}/shop/orders/${number}?checkout=success`,
    cancel_url: `${input.origin}/shop/checkout?canceled=1`,
    client_reference_id: input.order_id,
    metadata: {
      tenant_id: input.tenant_id,
      order_id: input.order_id,
      order_number: input.order_number,
      cart_id: input.cart_id,
    },
    line_items: shopCheckoutLineItems(input.items, input.currency),
    shipping_options: shopCheckoutShippingOptions(
      input.currency,
      input.shipping_cents,
      input.shipping_name,
    ),
    tax_id_collection: { enabled: true },
  };
  if (input.customer_id) {
    params.customer = input.customer_id;
  } else {
    params.customer_email = input.email;
  }
  if (input.automatic_tax) {
    params.automatic_tax = { enabled: true };
  }
  if (input.coupon_id) {
    params.discounts = [{ coupon: input.coupon_id }];
  }
  return params;
}
