import type {
  ShopSettingView,
  UpdateShopSettingBody,
} from "../../shared/settings.js";

export interface ShopSettingsFormValues {
  currency: string;
  origin_country: string;
  ioss_number: string;
  eori_number: string;
  stripe_tax_enabled: boolean;
}

export const INITIAL_SHOP_SETTINGS_FORM: ShopSettingsFormValues = {
  currency: "USD",
  origin_country: "CN",
  ioss_number: "",
  eori_number: "",
  stripe_tax_enabled: false,
};

const CURRENCY_RE = /^[A-Z]{3}$/u;
const COUNTRY_RE = /^[A-Z]{2}$/u;

export function settingToForm(setting: ShopSettingView): ShopSettingsFormValues {
  return {
    currency: setting.currency,
    origin_country: setting.origin_country,
    ioss_number: setting.ioss_number ?? "",
    eori_number: setting.eori_number ?? "",
    stripe_tax_enabled: setting.stripe_tax_enabled,
  };
}

export function buildSettingsPayload(
  form: ShopSettingsFormValues,
): UpdateShopSettingBody {
  return {
    currency: form.currency.trim().toUpperCase(),
    origin_country: form.origin_country.trim().toUpperCase(),
    ioss_number: form.ioss_number.trim() || null,
    eori_number: form.eori_number.trim() || null,
    stripe_tax_enabled: form.stripe_tax_enabled,
  };
}

type Translate = (key: string) => string;

export function validateSettingsForm(
  form: ShopSettingsFormValues,
  t: Translate,
): string | null {
  if (!CURRENCY_RE.test(form.currency.trim().toUpperCase())) {
    return t("validation.currencyInvalid");
  }
  if (!COUNTRY_RE.test(form.origin_country.trim().toUpperCase())) {
    return t("validation.countryInvalid");
  }
  return null;
}
