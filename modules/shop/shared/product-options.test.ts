import { describe, expect, it } from "vitest";

import {
  cartesianOptionCombos,
  composeVariantLabel,
  optionComboKey,
  suggestVariantSku,
  variantStorefrontLabel,
} from "./product-options.js";

import type { ShopProductOption } from "./catalog.js";

const color: ShopProductOption = {
  id: "opt-color",
  name: { "zh-CN": "颜色", en: "Color" },
  values: [
    { id: "red", name: { "zh-CN": "红", en: "Red" } },
    { id: "blue", name: { "zh-CN": "蓝", en: "Blue" } },
  ],
};

const size: ShopProductOption = {
  id: "opt-size",
  name: { "zh-CN": "尺码", en: "Size" },
  values: [
    { id: "s", name: { "zh-CN": "小", en: "S" } },
    { id: "m", name: { "zh-CN": "中", en: "M" } },
  ],
};

describe("cartesianOptionCombos", () => {
  it("returns one empty combo when there are no options", () => {
    expect(cartesianOptionCombos([])).toEqual([{}]);
  });

  it("crosses option values", () => {
    expect(cartesianOptionCombos([color, size])).toEqual([
      { "opt-color": "red", "opt-size": "s" },
      { "opt-color": "red", "opt-size": "m" },
      { "opt-color": "blue", "opt-size": "s" },
      { "opt-color": "blue", "opt-size": "m" },
    ]);
  });
});

describe("composeVariantLabel", () => {
  it("joins localized value names", () => {
    expect(
      composeVariantLabel( [color, size], { "opt-color": "red", "opt-size": "m" }, "en"),
    ).toBe("Red / M");
    expect(
      composeVariantLabel([color, size], { "opt-color": "red", "opt-size": "m" }, "zh-CN"),
    ).toBe("红 / 中");
  });
});

describe("variantStorefrontLabel", () => {
  it("prefers option labels over a stored title", () => {
    expect(
      variantStorefrontLabel(
        [color],
        {
          sku: "MUG-1",
          title: { en: "Ignored" },
          option_values: { "opt-color": "blue" },
        },
        "en",
      ),
    ).toBe("Blue");
  });

  it("falls back to sku when there are no options", () => {
    expect(
      variantStorefrontLabel(
        [],
        { sku: "MUG-1", title: null, option_values: {} },
        "en",
      ),
    ).toBe("MUG-1");
  });
});

describe("suggestVariantSku", () => {
  it("appends default-locale value slugs", () => {
    expect(
      suggestVariantSku("mug", [color], { "opt-color": "red" }),
    ).toBe("mug-red");
  });
});

describe("optionComboKey", () => {
  it("is order-independent", () => {
    expect(optionComboKey({ a: "1", b: "2" })).toBe(optionComboKey({ b: "2", a: "1" }));
  });
});
