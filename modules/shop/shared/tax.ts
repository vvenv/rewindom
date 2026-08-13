export interface TaxQuoteLine {
  amount_cents: number;
  hs_code?: string | null;
  origin_country?: string | null;
}

export interface TaxQuoteInput {
  destination_country: string;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  lines: TaxQuoteLine[];
}

export interface TaxQuoteResult {
  tax_cents: number;
  provider: string;
}

/** 税费接口。一期默认 0；Stripe Tax 在结账页开启后由 webhook 回写实收税。 */
export interface TaxProvider {
  readonly id: string;
  quote(input: TaxQuoteInput): Promise<TaxQuoteResult>;
}
