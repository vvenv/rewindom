import { describe, expect, it } from "vitest";

import {
  DEFAULT_BOOKMARK_SORT_VALUE,
  fromBookmarkSortValue,
  BOOKMARK_SORT_OPTIONS,
  toBookmarkSortValue,
} from "./bookmark-sort.js";

describe("toBookmarkSortValue", () => {
  it("缺字段时落到默认排序", () => {
    expect(toBookmarkSortValue(undefined, undefined)).toBe(
      DEFAULT_BOOKMARK_SORT_VALUE,
    );
  });

  it("服务端白名单之外的字段落到默认排序", () => {
    expect(toBookmarkSortValue("description", "asc")).toBe(
      DEFAULT_BOOKMARK_SORT_VALUE,
    );
  });

  it("方向缺省或非法时与服务端一致地落到 desc", () => {
    expect(toBookmarkSortValue("title", undefined)).toBe("title:desc");
    expect(toBookmarkSortValue("title", "bogus")).toBe("title:desc");
  });

  it("合法字段与方向原样保留", () => {
    expect(toBookmarkSortValue("created_at", "asc")).toBe("created_at:asc");
  });
});

describe("fromBookmarkSortValue", () => {
  it("每个下拉项都能解析", () => {
    for (const option of BOOKMARK_SORT_OPTIONS) {
      const { sortBy, sortDir } = fromBookmarkSortValue(option.value);
      expect(`${sortBy}:${sortDir}`).toBe(option.value);
    }
  });

  it("未知值落到默认排序", () => {
    expect(fromBookmarkSortValue("description:asc")).toEqual({
      sortBy: "updated_at",
      sortDir: "desc",
    });
  });
});

describe("BOOKMARK_SORT_OPTIONS", () => {
  it("能与 URL 表示互相往返", () => {
    for (const option of BOOKMARK_SORT_OPTIONS) {
      const { sortBy, sortDir } = fromBookmarkSortValue(option.value);
      expect(toBookmarkSortValue(sortBy, sortDir)).toBe(option.value);
    }
  });
});
