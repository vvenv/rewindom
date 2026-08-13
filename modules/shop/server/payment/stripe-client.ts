import Stripe from "stripe";

/** Stripe Node SDK client. Do not set a module-level API key. */
export function createShopStripe(secretKey: string): Stripe {
  return new Stripe(secretKey);
}
