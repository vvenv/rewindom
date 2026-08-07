import { describe, it, expect } from "vitest";

import type { Todo as TodoRecord } from "@be-water/server-kernel/generated/prisma/client/client.js";

import { toTodo, toTodoListItem } from "./todo.mapper.js";

function makeRecord(overrides: Partial<TodoRecord> = {}): TodoRecord {
  return {
    id: "todo-1",
    tenant_id: "tenant-a",
    title: "买牛奶",
    completed: false,
    created_by: "user-1",
    updated_by: "user-2",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  } as TodoRecord;
}

describe("todo.mapper", () => {
  describe("toTodoListItem", () => {
    it("Date 转 ISO 字符串", () => {
      const item = toTodoListItem(makeRecord());
      expect(item.created_at).toBe("2026-01-01T00:00:00.000Z");
      expect(item.updated_at).toBe("2026-01-02T00:00:00.000Z");
    });

    it("字段透传(id/title/completed/created_by/updated_by)", () => {
      const item = toTodoListItem(makeRecord());
      expect(item.id).toBe("todo-1");
      expect(item.title).toBe("买牛奶");
      expect(item.completed).toBe(false);
      expect(item.created_by).toBe("user-1");
      expect(item.updated_by).toBe("user-2");
    });

    it("completed=true 透传", () => {
      expect(
        toTodoListItem(makeRecord({ completed: true })).completed,
      ).toBe(true);
    });

    it("列表项不含 tenant_id(不暴露租户隔离字段)", () => {
      const item = toTodoListItem(makeRecord());
      expect(item).not.toHaveProperty("tenant_id");
    });
  });

  describe("toTodo", () => {
    it("Date 转 ISO 字符串", () => {
      const todo = toTodo(makeRecord());
      expect(todo.created_at).toBe("2026-01-01T00:00:00.000Z");
      expect(todo.updated_at).toBe("2026-01-02T00:00:00.000Z");
    });

    it("字段透传(含 tenant_id)", () => {
      const todo = toTodo(makeRecord());
      expect(todo.id).toBe("todo-1");
      expect(todo.tenant_id).toBe("tenant-a");
      expect(todo.title).toBe("买牛奶");
      expect(todo.completed).toBe(false);
      expect(todo.created_by).toBe("user-1");
      expect(todo.updated_by).toBe("user-2");
    });
  });
});
