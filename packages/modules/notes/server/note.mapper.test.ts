import { describe, it, expect } from "vitest";

import type { Note as NoteRecord } from "@be-water/server-kernel/generated/prisma/client/client.js";

import { toNote, toNoteListItem } from "./note.mapper.js";
import { buildNoteContentPreview } from "./note.util.js";

function makeRecord(overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: "note-1",
    tenant_id: "tenant-a",
    title: "我的笔记",
    content: "正文内容",
    created_by: "user-1",
    updated_by: "user-2",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  } as NoteRecord;
}

describe("note.mapper", () => {
  describe("toNoteListItem", () => {
    it("Date 转 ISO 字符串", () => {
      const item = toNoteListItem(makeRecord());
      expect(item.created_at).toBe("2026-01-01T00:00:00.000Z");
      expect(item.updated_at).toBe("2026-01-02T00:00:00.000Z");
    });

    it("content 经 buildNoteContentPreview 处理", () => {
      const item = toNoteListItem(
        makeRecord({ content: "  多余\n空白  内容  " }),
      );
      // buildNoteContentPreview 会合并空白并 trim
      expect(item.content_preview).toBe(buildNoteContentPreview("  多余\n空白  内容  "));
      expect(item.content_preview).toBe("多余 空白 内容");
    });

    it("空 content 的 preview 为空串", () => {
      const item = toNoteListItem(makeRecord({ content: "   " }));
      expect(item.content_preview).toBe("");
    });

    it("长 content 截断到 120 字符 + 省略号", () => {
      const long = "a".repeat(200);
      const item = toNoteListItem(makeRecord({ content: long }));
      expect(item.content_preview).toHaveLength(121); // 120 + …
      expect(item.content_preview.endsWith("…")).toBe(true);
    });

    it("字段透传(id/title/created_by/updated_by)", () => {
      const item = toNoteListItem(makeRecord());
      expect(item.id).toBe("note-1");
      expect(item.title).toBe("我的笔记");
      expect(item.created_by).toBe("user-1");
      expect(item.updated_by).toBe("user-2");
    });

    it("不含 tenant_id / content(列表项不暴露)", () => {
      const item = toNoteListItem(makeRecord());
      expect(item).not.toHaveProperty("tenant_id");
      expect(item).not.toHaveProperty("content");
    });
  });

  describe("toNote", () => {
    it("Date 转 ISO 字符串", () => {
      const note = toNote(makeRecord());
      expect(note.created_at).toBe("2026-01-01T00:00:00.000Z");
      expect(note.updated_at).toBe("2026-01-02T00:00:00.000Z");
    });

    it("content 原样透传(不截断,详情页用)", () => {
      const long = "x".repeat(500);
      const note = toNote(makeRecord({ content: long }));
      expect(note.content).toBe(long);
    });

    it("字段透传(含 tenant_id)", () => {
      const note = toNote(makeRecord());
      expect(note.id).toBe("note-1");
      expect(note.tenant_id).toBe("tenant-a");
      expect(note.title).toBe("我的笔记");
      expect(note.content).toBe("正文内容");
      expect(note.created_by).toBe("user-1");
      expect(note.updated_by).toBe("user-2");
    });
  });
});
