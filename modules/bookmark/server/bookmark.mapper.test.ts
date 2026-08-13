import { prisma } from "@rewindom/module-sdk/server";
import { describe, expect, it } from "vitest";

import { toBookmark, toBookmarkListItem } from "./bookmark.mapper.js";

type BookmarkRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.bookmark.findFirst>>
>;

function makeRecord(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    tenant_id: "tenant-a",
    url: "https://example.com/docs",
    host: "example.com",
    title: "示例文档",
    description: "一段描述",
    created_by: "user-1",
    updated_by: "user-2",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  } as BookmarkRecord;
}

describe("bookmark.mapper", () => {
  describe("toBookmarkListItem", () => {
    it("Date 转 ISO 字符串", () => {
      const item = toBookmarkListItem(makeRecord());
      expect(item.created_at).toBe("2026-01-01T00:00:00.000Z");
      expect(item.updated_at).toBe("2026-01-02T00:00:00.000Z");
    });

    it("description 走 buildDescriptionPreview（合并空白）", () => {
      const item = toBookmarkListItem(
        makeRecord({ description: "  多余\n空白  内容  " }),
      );
      expect(item.description_preview).toBe("多余 空白 内容");
    });

    it("超长 description 截断到 120 字符 + 省略号", () => {
      const item = toBookmarkListItem(
        makeRecord({ description: "a".repeat(200) }),
      );
      expect(item.description_preview).toHaveLength(121);
      expect(item.description_preview.endsWith("…")).toBe(true);
    });

    it("字段透传（id/url/host/title）", () => {
      const item = toBookmarkListItem(makeRecord());
      expect(item.id).toBe("bookmark-1");
      expect(item.url).toBe("https://example.com/docs");
      expect(item.host).toBe("example.com");
      expect(item.title).toBe("示例文档");
    });

    it("不含 tenant_id / 完整 description（列表项不暴露）", () => {
      const item = toBookmarkListItem(makeRecord());
      expect(item).not.toHaveProperty("tenant_id");
      expect(item).not.toHaveProperty("description");
    });
  });

  describe("toBookmark", () => {
    it("description 原样透传（不截断，编辑用）", () => {
      const long = "x".repeat(500);
      expect(toBookmark(makeRecord({ description: long })).description).toBe(
        long,
      );
    });

    it("字段透传（含 tenant_id / updated_by）", () => {
      const bookmark = toBookmark(makeRecord());
      expect(bookmark.tenant_id).toBe("tenant-a");
      expect(bookmark.host).toBe("example.com");
      expect(bookmark.created_by).toBe("user-1");
      expect(bookmark.updated_by).toBe("user-2");
    });

    it("updated_by 可为 null", () => {
      expect(
        toBookmark(makeRecord({ updated_by: null })).updated_by,
      ).toBeNull();
    });
  });
});
