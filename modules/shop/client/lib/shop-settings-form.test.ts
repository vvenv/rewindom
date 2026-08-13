import { registerI18nBundles, setupI18n } from "@rewindom/module-sdk/client";
import { describe, expect, it } from "vitest";

import { SHOP_I18N } from "../i18n.js";
import {
  buildSettingsPayload,
  INITIAL_SHOP_SETTINGS_FORM,
  settingToForm,
  validateSettingsForm,
} from "./shop-settings-form.js";

registerI18nBundles([SHOP_I18N]);
setupI18n();
const t = (key: string): string => setupI18n().t(key, { ns: "shop" });

describe("validateSettingsForm", () => {
  it("rejects non-ISO currency and country codes", () => {
    expect(
      validateSettingsForm({ ...INITIAL_SHOP_SETTINGS_FORM, currency: "US" }, t),
    ).toBe(t("validation.currencyInvalid"));
    expect(
      validateSettingsForm(
        { ...INITIAL_SHOP_SETTINGS_FORM, origin_country: "USA" },
        t,
      ),
    ).toBe(t("validation.countryInvalid"));
  });

  it("accepts ISO codes regardless of case", () => {
    expect(
      validateSettingsForm(
        { ...INITIAL_SHOP_SETTINGS_FORM, currency: "eur", origin_country: "de" },
        t,
      ),
    ).toBeNull();
  });
});

describe("buildSettingsPayload", () => {
  it("uppercases codes and treats blank customs IDs as null", () => {
    expect(
      buildSettingsPayload({
        currency: "eur",
        origin_country: "de",
        ioss_number: "  ",
        eori_number: "DE123",
        stripe_tax_enabled: true,
      }),
    ).toEqual({
      currency: "EUR",
      origin_country: "DE",
      ioss_number: null,
      eori_number: "DE123",
      stripe_tax_enabled: true,
    });
  });
});

describe("settingToForm", () => {
  it("maps null customs IDs to empty strings", () => {
    expect(
      settingToForm({
        currency: "USD",
        origin_country: "CN",
        ioss_number: null,
        eori_number: null,
        stripe_tax_enabled: false,
      }),
    ).toEqual(INITIAL_SHOP_SETTINGS_FORM);
  });
});
