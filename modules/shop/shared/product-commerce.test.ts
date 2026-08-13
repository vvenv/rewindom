import { describe, expect, it } from "vitest";

import {
  cartRequiresShipping,
  featuredImage,
  isShopImageUrl,
  isVariantAvailable,
  readBarcode,
  readOrderNote,
  readShopImages,
  readShopTags,
  SHOP_MAX_NOTE_LENGTH,
} from "./product-commerce.js";

describe("readShopImages", () => {
  it("keeps http(s) and site-relative urls, drops junk", () => {
    expect(
      readShopImages([
        { id: "a", url: "/t/site-assets/1.jpg", alt: { en: "Mug" } },
        { url: "https://cdn.example/x.webp" },
        { url: "javascript:alert(1)" },
        { url: "" },
      ]),
    ).toEqual([
      { id: "a", url: "/t/site-assets/1.jpg", alt: { en: "Mug" } },
      expect.objectContaining({
        url: "https://cdn.example/x.webp",
        alt: {},
      }),
    ]);
  });
});

describe("isShopImageUrl", () => {
  it("accepts relative site paths and http(s)", () => {
    expect(isShopImageUrl("/abc.jpg")).toBe(true);
    expect(isShopImageUrl("https://x.test/a.png")).toBe(true);
    expect(isShopImageUrl("//evil.test/x")).toBe(false);
    expect(isShopImageUrl("ftp://x")).toBe(false);
  });
});

describe("featuredImage", () => {
  it("returns the first image", () => {
    expect(
      featuredImage([
        { id: "1", url: "/a.jpg", alt: {} },
        { id: "2", url: "/b.jpg", alt: {} },
      ])?.url,
    ).toBe("/a.jpg");
  });
});

describe("readShopTags", () => {
  it("normalizes, dedupes and caps length", () => {
    expect(readShopTags("Mug,  mug，Ceramic")).toEqual(["mug", "ceramic"]);
    expect(readShopTags(["  Summer ", "summer", ""])).toEqual(["summer"]);
  });
});

describe("readBarcode", () => {
  it("accepts sku-like barcodes", () => {
    expect(readBarcode("  1234567890123 ")).toBe("1234567890123");
    expect(readBarcode("bad barcode")).toBeNull();
  });
});

describe("isVariantAvailable", () => {
  it("respects track_inventory and inventory_policy", () => {
    expect(
      isVariantAvailable({
        stock_qty: 0,
        track_inventory: false,
        inventory_policy: "deny",
      }),
    ).toBe(true);
    expect(
      isVariantAvailable({
        stock_qty: 0,
        track_inventory: true,
        inventory_policy: "continue",
      }),
    ).toBe(true);
    expect(
      isVariantAvailable({
        stock_qty: 0,
        track_inventory: true,
        inventory_policy: "deny",
      }),
    ).toBe(false);
    expect(
      isVariantAvailable(
        {
          stock_qty: 1,
          track_inventory: true,
          inventory_policy: "deny",
        },
        2,
      ),
    ).toBe(false);
  });
});

describe("cartRequiresShipping", () => {
  it("is true when any physical line remains", () => {
    expect(
      cartRequiresShipping([
        { requires_shipping: false },
        { requires_shipping: true },
      ]),
    ).toBe(true);
    expect(cartRequiresShipping([{ requires_shipping: false }])).toBe(false);
  });
});

describe("readOrderNote", () => {
  it("trims and caps", () => {
    expect(readOrderNote("  please wrap  ")).toBe("please wrap");
    expect(readOrderNote("x".repeat(SHOP_MAX_NOTE_LENGTH + 10))?.length).toBe(
      SHOP_MAX_NOTE_LENGTH,
    );
  });
});
