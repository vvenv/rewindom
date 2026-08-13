export interface ShopShippingRateView {
  id: string;
  zone_id: string;
  name: string;
  carrier_code: string;
  price_cents: number;
  min_days: number | null;
  max_days: number | null;
}

export interface ShopShippingZoneView {
  id: string;
  name: string;
  countries: string[];
  rates: ShopShippingRateView[];
}

export interface ShopShippingQuote extends ShopShippingRateView {
  zone_name: string;
}

export interface CreateShopShippingZoneBody {
  name: string;
  countries: string[];
}

export interface UpdateShopShippingZoneBody {
  name?: string;
  countries?: string[];
}

export interface CreateShopShippingRateBody {
  name: string;
  carrier_code: string;
  price_cents: number;
  min_days?: number | null;
  max_days?: number | null;
}

export interface UpdateShopShippingRateBody {
  name?: string;
  carrier_code?: string;
  price_cents?: number;
  min_days?: number | null;
  max_days?: number | null;
}

/** 物流报价接口。一期只有费率表实现；物流商 API 二期再填。 */
export interface CarrierQuoteInput {
  destination_country: string;
  weight_g: number;
  currency: string;
}

export interface CarrierProvider {
  readonly id: string;
  quote(input: CarrierQuoteInput): Promise<ShopShippingQuote[]>;
}
