import { describe, expect, it } from "vitest";

import {
  DISPLAY_CATALOG_MAX_PAGE_SIZE,
  parseDisplayCatalogPagination,
  parsePagination,
} from "./pagination.js";

describe("parsePagination", () => {
  it("uses defaults when query is empty", () => {
    expect(parsePagination({})).toEqual({ page: 1, page_size: 20 });
  });

  it("clamps page_size to maxPageSize", () => {
    expect(parsePagination({ page_size: "200" })).toEqual({
      page: 1,
      page_size: 100,
    });
  });

  it("parses valid page and page_size", () => {
    expect(parsePagination({ page: "2", page_size: "50" })).toEqual({
      page: 2,
      page_size: 50,
    });
  });

  it("clamps page to minimum 1", () => {
    expect(parsePagination({ page: "0" })).toEqual({ page: 1, page_size: 20 });
    expect(parsePagination({ page: "-5" })).toEqual({ page: 1, page_size: 20 });
  });

  it("respects custom defaults and maxPageSize", () => {
    expect(
      parsePagination(
        { page_size: "500" },
        { page_size: 50, maxPageSize: 200 },
      ),
    ).toEqual({ page: 1, page_size: 200 });
  });
});

describe("parseDisplayCatalogPagination", () => {
  it("allows page_size up to DISPLAY_CATALOG_MAX_PAGE_SIZE", () => {
    expect(
      parseDisplayCatalogPagination({
        page: "1",
        page_size: String(DISPLAY_CATALOG_MAX_PAGE_SIZE),
      }),
    ).toEqual({ page: 1, page_size: DISPLAY_CATALOG_MAX_PAGE_SIZE });
  });

  it("still clamps page_size above DISPLAY_CATALOG_MAX_PAGE_SIZE", () => {
    expect(
      parseDisplayCatalogPagination({ page_size: "1000" }),
    ).toEqual({ page: 1, page_size: DISPLAY_CATALOG_MAX_PAGE_SIZE });
  });
});
