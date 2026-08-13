import { describe, expect, it } from "vitest";

import { StripeCheckoutTaxProvider, ZeroTaxProvider } from "./tax.provider.js";

describe("TaxProvider", () => {
  it("ZeroTaxProvider quotes 0", async () => {
    const tax = await new ZeroTaxProvider().quote({
      destination_country: "US",
      currency: "USD",
      subtotal_cents: 1000,
      shipping_cents: 500,
      lines: [{ amount_cents: 1000 }],
    });
    expect(tax).toEqual({ tax_cents: 0, provider: "none" });
  });

  it("StripeCheckoutTaxProvider quotes 0 until webhook", async () => {
    const tax = await new StripeCheckoutTaxProvider().quote({
      destination_country: "DE",
      currency: "EUR",
      subtotal_cents: 2000,
      shipping_cents: 0,
      lines: [{ amount_cents: 2000, hs_code: "0901" }],
    });
    expect(tax).toEqual({ tax_cents: 0, provider: "stripe" });
  });
});
