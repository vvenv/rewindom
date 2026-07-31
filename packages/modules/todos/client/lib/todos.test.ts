import { describe, expect, it } from "vitest";

import {
  parseTodoStatus,
  resolveTodoTitleEdit,
  TODO_STATUS_ALL,
  TODO_TITLE_MAX_LENGTH,
  todoStatusToCompleted,
  validateTodoTitle,
} from "./todos.js";

describe("validateTodoTitle", () => {
  it("rejects blank title", () => {
    expect(validateTodoTitle("  ")).toBe("validation.titleRequired");
  });

  it("rejects overlong title", () => {
    expect(validateTodoTitle("x".repeat(TODO_TITLE_MAX_LENGTH + 1))).toBe(
      "validation.titleTooLong",
    );
  });

  it("accepts a normal title", () => {
    expect(validateTodoTitle(" 写周报 ")).toBeNull();
  });
});

describe("resolveTodoTitleEdit", () => {
  it("清空标题＝删除该条", () => {
    expect(resolveTodoTitleEdit("写周报", "   ")).toEqual({ action: "delete" });
  });

  it("只改了首尾空白视为没改", () => {
    expect(resolveTodoTitleEdit("写周报", "  写周报  ")).toEqual({
      action: "none",
    });
  });

  it("改过内容则保存去空白后的标题", () => {
    expect(resolveTodoTitleEdit("写周报", "  写月报 ")).toEqual({
      action: "save",
      title: "写月报",
    });
  });

  it("超长标题不提交，给出提示", () => {
    const result = resolveTodoTitleEdit(
      "写周报",
      "x".repeat(TODO_TITLE_MAX_LENGTH + 1),
    );
    expect(result.action).toBe("invalid");
  });
});

describe("parseTodoStatus", () => {
  it("falls back to all for unknown values", () => {
    expect(parseTodoStatus(null)).toBe(TODO_STATUS_ALL);
    expect(parseTodoStatus("nope")).toBe(TODO_STATUS_ALL);
  });

  it("keeps known values", () => {
    expect(parseTodoStatus("active")).toBe("active");
    expect(parseTodoStatus("done")).toBe("done");
  });
});

describe("todoStatusToCompleted", () => {
  it("maps filter to the API flag", () => {
    expect(todoStatusToCompleted(TODO_STATUS_ALL)).toBeUndefined();
    expect(todoStatusToCompleted("active")).toBe(false);
    expect(todoStatusToCompleted("done")).toBe(true);
  });
});
