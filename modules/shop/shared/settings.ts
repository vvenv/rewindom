export interface ShopSettingView {
  currency: string;
  origin_country: string;
  ioss_number: string | null;
  eori_number: string | null;
  stripe_tax_enabled: boolean;
}

export interface UpdateShopSettingBody {
  currency?: string;
  origin_country?: string;
  ioss_number?: string | null;
  eori_number?: string | null;
  stripe_tax_enabled?: boolean;
}

export interface ShopProviderStatus {
  configured: boolean;
  source: "platform" | "tenant" | "none";
  secret_hint: string | null;
  publishable_key_hint: string | null;
}

export interface UpdateShopProviderBody {
  secret_key?: string;
  webhook_secret?: string;
  publishable_key?: string;
}
