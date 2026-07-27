import { describe, expect, it } from "vitest";

import {
  applyEnumSearchParam,
  applyFiltersToSearchParams,
  getOptionalSearchParam,
  parseListPage,
  parseListPageSize,
  parseListSort,
  parseSearchParamEnum,
  parseSearchParamsPagination,
  SEARCH_PARAM_FILTER_ALL,
  toSearchParamEnumSet,
  toSortingState,
} from "../lib/list-url-params";

const TEST_FILTERS = [
  { value: SEARCH_PARAM_FILTER_ALL, label: "全部" },
  { value: "OPEN", label: "待处理" },
] as const;

const TEST_FILTER_VALUES = toSearchParamEnumSet(TEST_FILTERS);

describe("list-url-params", () => {
  it("parses page safely", () => {
    expect(parseListPage(null)).toBe(1);
    expect(parseListPage("2")).toBe(2);
    expect(parseListPage("-1")).toBe(1);
  });

  it("parses sort params", () => {
    const params = new URLSearchParams("sort_by=created_at&sort_dir=asc");
    expect(parseListSort(params)).toEqual({
      sortBy: "created_at",
      sortDir: "asc",
    });
    expect(toSortingState("created_at", "asc")).toEqual([
      { id: "created_at", desc: false },
    ]);
  });

  it("applies filters and resets page", () => {
    const params = new URLSearchParams("page=3&q=old");
    const next = applyFiltersToSearchParams(params, {
      q: "new",
      role: undefined,
    });
    expect(next.get("q")).toBe("new");
    expect(next.get("page")).toBe("1");
    expect(next.get("role")).toBeNull();
  });

  it("reads optional params and pagination", () => {
    const params = new URLSearchParams("page=2&page_size=50&level=error");
    expect(getOptionalSearchParam(params, "level")).toBe("error");
    expect(getOptionalSearchParam(params, "missing")).toBeUndefined();
    expect(parseSearchParamsPagination(params)).toEqual({
      page: 2,
      pageSize: 50,
    });
  });

  it("falls back to default page size for invalid values", () => {
    expect(parseListPageSize("999")).toBe(20);
    expect(parseListPageSize("abc")).toBe(20);
    expect(parseListPageSize("10", 10)).toBe(10);
  });

  it("parses enum search params", () => {
    expect(
      parseSearchParamEnum(null, TEST_FILTER_VALUES, SEARCH_PARAM_FILTER_ALL),
    ).toBe(SEARCH_PARAM_FILTER_ALL);
    expect(parseSearchParamEnum("OPEN", TEST_FILTER_VALUES, "OPEN")).toBe(
      "OPEN",
    );
    expect(
      parseSearchParamEnum("invalid", TEST_FILTER_VALUES, "OPEN"),
    ).toBe("OPEN");
  });

  it("applies enum search params and resets page", () => {
    const params = new URLSearchParams("page=3&status=OPEN");
    const cleared = applyEnumSearchParam(
      params,
      "status",
      SEARCH_PARAM_FILTER_ALL,
      SEARCH_PARAM_FILTER_ALL,
      { resetPage: true },
    );
    expect(cleared.get("status")).toBeNull();
    expect(cleared.get("page")).toBeNull();

    const next = applyEnumSearchParam(
      new URLSearchParams(),
      "status",
      "OPEN",
      SEARCH_PARAM_FILTER_ALL,
    );
    expect(next.get("status")).toBe("OPEN");
  });
});
