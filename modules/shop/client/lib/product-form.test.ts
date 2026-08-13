import { registerI18nBundles, setupI18n } from "@rewindom/module-sdk/client";
import { describe, expect, it } from "vitest";

import { SHOP_I18N } from "../i18n.js";
import {
  buildProductPayload,
  INITIAL_PRODUCT_FORM,
  splitCountries,
  validateProductForm,
} from "./product-form.js";

registerI18nBundles([SHOP_I18N]);
setupI18n();
const t = (key: string): string => setupI18n().t(key, { ns: "shop" });

describe("validateProductForm", () => {
  it("requires title slug sku and price", () => {
    expect(validateProductForm(INITIAL_PRODUCT_FORM, t)).toBe(
      t("validation.titleRequired"),
    );
    expect(
      validateProductForm({ ...INITIAL_PRODUCT_FORM, title: "Mug" }, t),
    ).toBe(t("validation.slugRequired"));
  });
});

describe("buildProductPayload", () => {
  it("normalizes slug and cents", () => {
    expect(
      buildProductPayload({
        ...INITIAL_PRODUCT_FORM,
        title: " 杯 ",
        title_en: "Mug",
        slug: "Coffee-Mug",
        sku: "MUG-1",
        price_cents: "1999",
        stock_qty: "3",
      }),
    ).toEqual({
      slug: "coffee-mug",
      status: "draft",
      title: { "zh-CN": "杯", en: "Mug" },
      variant: {
        sku: "MUG-1",
        price_cents: 1999,
        stock_qty: 3,
        weight_g: 0,
        hs_code: null,
        origin_country: null,
      },
    });
  });
});

describe("splitCountries", () => {
  it("splits and uppercases", () => {
    expect(splitCountries("us, gb  de")).toEqual(["US", "GB", "DE"]);
  });
});
