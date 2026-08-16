import { describe, expect, it } from "vitest";

import {
  collectionDescendantIds,
  collectionSelectOptions,
  filterProductsByCollectionSlug,
  sliceCollectionTree,
  wouldCreateCollectionCycle,
} from "./collection.js";

describe("sliceCollectionTree", () => {
  const cards = [
    { slug: "apparel", parent_slug: null, href: "/shop/collections/apparel", title: "Apparel", product_count: 2, sort_order: 0 },
    { slug: "shirts", parent_slug: "apparel", href: "/shop/collections/shirts", title: "Shirts", product_count: 1, sort_order: 0 },
    { slug: "home", parent_slug: null, href: "/shop/collections/home", title: "Home", product_count: 0, sort_order: 1 },
    { slug: "mugs", parent_slug: "home", href: "/shop/collections/mugs", title: "Mugs", product_count: 3, sort_order: 0 },
    { slug: "orphan", parent_slug: "missing", href: "/shop/collections/orphan", title: "Orphan", product_count: 1, sort_order: 0 },
    { slug: "empty", parent_slug: null, href: "/shop/collections/empty", title: "Empty", product_count: 0, sort_order: 2 },
  ];

  it("empty root lists published top-level nodes including orphans", () => {
    const tree = sliceCollectionTree(cards, {
      depth: 2,
      include_root: true,
      show_empty: true,
    });
    expect(tree.map((node) => node.slug)).toEqual(["apparel", "orphan", "home", "empty"]);
    expect(tree[0]?.children.map((node) => node.slug)).toEqual(["shirts"]);
    expect(tree.find((node) => node.slug === "home")?.children.map((node) => node.slug)).toEqual([
      "mugs",
    ]);
  });

  it("depth 1 hides children", () => {
    const tree = sliceCollectionTree(cards, {
      depth: 1,
      include_root: true,
      show_empty: true,
    });
    expect(tree.map((node) => node.slug)).toEqual(["apparel", "orphan", "home", "empty"]);
    expect(tree[0]?.children).toEqual([]);
  });

  it("root slug with include_root starts at that node", () => {
    const tree = sliceCollectionTree(cards, {
      root_slug: "apparel",
      depth: 3,
      include_root: true,
      show_empty: true,
    });
    expect(tree).toHaveLength(1);
    expect(tree[0]?.slug).toBe("apparel");
    expect(tree[0]?.children[0]?.slug).toBe("shirts");
  });

  it("root slug without include_root lists children only", () => {
    const tree = sliceCollectionTree(cards, {
      root_slug: "apparel",
      depth: 2,
      include_root: false,
      show_empty: true,
    });
    expect(tree.map((node) => node.slug)).toEqual(["shirts"]);
  });

  it("treats the all-roots sentinel like an empty root", () => {
    const empty = sliceCollectionTree(cards, {
      depth: 2,
      include_root: true,
      show_empty: true,
    });
    const sentinel = sliceCollectionTree(cards, {
      root_slug: "__all__",
      depth: 2,
      include_root: true,
      show_empty: true,
    });
    expect(sentinel.map((node) => node.slug)).toEqual(empty.map((node) => node.slug));
  });

  it("unknown root yields an empty tree", () => {
    expect(
      sliceCollectionTree(cards, {
        root_slug: "missing",
        depth: 3,
        include_root: true,
        show_empty: true,
      }),
    ).toEqual([]);
  });

  it("hides empty leaves when show_empty is off", () => {
    const tree = sliceCollectionTree(cards, {
      depth: 3,
      include_root: true,
      show_empty: false,
    });
    expect(tree.map((node) => node.slug)).toEqual(["apparel", "orphan", "home"]);
    expect(tree.find((node) => node.slug === "home")?.children.map((node) => node.slug)).toEqual([
      "mugs",
    ]);
  });
});

describe("collectionSelectOptions", () => {
  it("flattens the tree with indented labels", () => {
    expect(
      collectionSelectOptions([
        {
          slug: "apparel",
          parent_slug: null,
          href: "/shop/collections/apparel",
          title: "Apparel",
          product_count: 1,
          sort_order: 0,
        },
        {
          slug: "shirts",
          parent_slug: "apparel",
          href: "/shop/collections/shirts",
          title: "Shirts",
          product_count: 1,
          sort_order: 0,
        },
      ]),
    ).toEqual([
      { value: "apparel", label: "Apparel" },
      { value: "shirts", label: "— Shirts" },
    ]);
  });
});

describe("wouldCreateCollectionCycle", () => {
  const nodes = [
    { id: "a", parent_id: null },
    { id: "b", parent_id: "a" },
    { id: "c", parent_id: "b" },
  ];

  it("rejects self and ancestor loops", () => {
    expect(wouldCreateCollectionCycle(nodes, "a", "a")).toBe(true);
    expect(wouldCreateCollectionCycle(nodes, "a", "c")).toBe(true);
    expect(wouldCreateCollectionCycle(nodes, "b", "c")).toBe(true);
  });

  it("allows moving under a sibling branch or to the top", () => {
    expect(wouldCreateCollectionCycle(nodes, "c", "a")).toBe(false);
    expect(wouldCreateCollectionCycle(nodes, "c", null)).toBe(false);
  });
});

describe("collectionDescendantIds", () => {
  it("collects the whole subtree", () => {
    expect(
      collectionDescendantIds(
        [
          { id: "a", parent_id: null },
          { id: "b", parent_id: "a" },
          { id: "c", parent_id: "b" },
          { id: "d", parent_id: null },
        ],
        "a",
      ),
    ).toEqual(new Set(["b", "c"]));
  });
});

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
