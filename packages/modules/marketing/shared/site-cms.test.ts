import { describe, expect, it } from "vitest";

import { marketingPagePath } from "./site-cms.js";

describe("marketingPagePath", () => {
  it("maps home / doc index / doc / page", () => {
    expect(marketingPagePath("home", "home")).toBe("/");
    expect(marketingPagePath("doc", "index")).toBe("/docs");
    expect(marketingPagePath("doc", "guide")).toBe("/docs/guide");
    expect(marketingPagePath("page", "about")).toBe("/about");
  });
});
