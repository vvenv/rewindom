import type { TaxProvider, TaxQuoteResult } from "../../shared/index.js";

export class ZeroTaxProvider implements TaxProvider {
  readonly id = "none";
  async quote(): Promise<TaxQuoteResult> {
    return { tax_cents: 0, provider: this.id };
  }
}

/** Stripe Tax 在 Checkout Session 上开启；下单时税额为 0，webhook 回写实收。 */
export class StripeCheckoutTaxProvider implements TaxProvider {
  readonly id = "stripe";
  async quote(): Promise<TaxQuoteResult> {
    return { tax_cents: 0, provider: this.id };
  }
}
