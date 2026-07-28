import { describe, expect, it } from "vitest";

import {
  buildTodoPayload,
  INITIAL_TODO_FORM,
  parseTodoStatus,
  TODO_STATUS_ALL,
  TODO_TITLE_MAX_LENGTH,
  todoStatusToCompleted,
  validateTodoForm,
} from "./todos.js";

describe("validateTodoForm", () => {
  it("rejects blank title", () => {
    expect(validateTodoForm({ ...INITIAL_TODO_FORM, title: "  " })).toBe(
      "请输入标题",
    );
  });

  it("rejects overlong title", () => {
    expect(
      validateTodoForm({
        ...INITIAL_TODO_FORM,
        title: "x".repeat(TODO_TITLE_MAX_LENGTH + 1),
      }),
    ).toContain("不能超过");
  });
});

describe("buildTodoPayload", () => {
  it("trims text and passes other fields through", () => {
    expect(
      buildTodoPayload({
        ...INITIAL_TODO_FORM,
        title: "  x  ",
        completed: true,
      }),
    ).toEqual({
      ...INITIAL_TODO_FORM,
      title: "x",
      completed: true,
    });
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
