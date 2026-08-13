import { registerI18nBundles, setupI18n } from "@rewindom/module-sdk/client";
import { describe, expect, it } from "vitest";

import { SHOP_I18N } from "../i18n.js";
import {
  buildProductPayload,
  INITIAL_PRODUCT_FORM,
  newOption,
  newOptionValue,
  splitCountries,
  syncVariantsToOptions,
  validateProductForm,
} from "./product-form.js";

registerI18nBundles([SHOP_I18N]);
setupI18n();
const t = (key: string): string => setupI18n().t(key, { ns: "shop" });

describe("validateProductForm", () => {
  it("requires default-locale title, slug, sku and price", () => {
    expect(validateProductForm(INITIAL_PRODUCT_FORM, t)).toBe(
      t("validation.titleRequired"),
    );
    expect(
      validateProductForm(
        { ...INITIAL_PRODUCT_FORM, title: { "zh-CN": "杯" } },
        t,
      ),
    ).toBe(t("validation.slugRequired"));
  });
});

describe("buildProductPayload", () => {
  it("sends locale maps and variants, not a parallel English UI field", () => {
    expect(
      buildProductPayload({
        ...INITIAL_PRODUCT_FORM,
        title: { "zh-CN": "杯", en: "Mug" },
        description: { "zh-CN": "陶瓷杯", en: "Ceramic mug" },
        slug: "Coffee-Mug",
        variants: [
          {
            ...INITIAL_PRODUCT_FORM.variants[0]!,
            sku: "MUG-1",
            price_cents: "1999",
            stock_qty: "3",
          },
        ],
      }),
    ).toEqual({
      slug: "coffee-mug",
      status: "draft",
      title: { "zh-CN": "杯", en: "Mug" },
      subtitle: null,
      description: { "zh-CN": "陶瓷杯", en: "Ceramic mug" },
      images: [],
      product_type: null,
      vendor: null,
      tags: "",
      seo_title: null,
      seo_description: null,
      options: [],
      collection_ids: [],
      variants: [
        {
          id: undefined,
          sku: "MUG-1",
          option_values: {},
          price_cents: 1999,
          compare_at_price_cents: null,
          stock_qty: 3,
          weight_g: 0,
          barcode: null,
          hs_code: null,
          origin_country: null,
          inventory_policy: "deny",
          track_inventory: true,
          requires_shipping: true,
          taxable: true,
        },
      ],
    });
  });
});

describe("syncVariantsToOptions", () => {
  it("builds the cartesian set and keeps matching rows", () => {
    const option = {
      ...newOption(),
      name: { "zh-CN": "颜色" },
      values: [
        { ...newOptionValue(), name: { "zh-CN": "红" } },
        { ...newOptionValue(), name: { "zh-CN": "蓝" } },
      ],
    };
    const next = syncVariantsToOptions([option], INITIAL_PRODUCT_FORM.variants, "mug");
    expect(next).toHaveLength(2);
    expect(next[0]?.option_values[option.id]).toBe(option.values[0]?.id);
    expect(next[1]?.option_values[option.id]).toBe(option.values[1]?.id);
  });
});

describe("splitCountries", () => {
  it("splits and uppercases", () => {
    expect(splitCountries("us, gb  de")).toEqual(["US", "GB", "DE"]);
  });
});
