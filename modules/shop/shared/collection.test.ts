import { describe, expect, it } from "vitest";

import { filterProductsByCollectionSlug } from "./collection.js";

describe("filterProductsByCollectionSlug", () => {
  const products = [
    { slug: "mug", collection_slugs: ["summer", "kitchen"] },
    { slug: "lamp", collection_slugs: ["home"] },
    { slug: "bowl", collection_slugs: [] },
  ];

  it("empty slug returns every product", () => {
    expect(filterProductsByCollectionSlug(products, "")).toEqual(products);
    expect(filterProductsByCollectionSlug(products, undefined)).toEqual(
      products,
    );
    expect(filterProductsByCollectionSlug(products, "  ")).toEqual(products);
  });

  it("keeps only products in that collection", () => {
    expect(filterProductsByCollectionSlug(products, "summer")).toEqual([
      products[0],
    ]);
    expect(filterProductsByCollectionSlug(products, "home")).toEqual([
      products[1],
    ]);
    expect(filterProductsByCollectionSlug(products, "missing")).toEqual([]);
  });
});
