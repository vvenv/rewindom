import { describe, it, expect } from "vitest";

import {
  TODO_TITLE_MAX_LENGTH,
  validateTodoInput,
} from "./todo.util.js";

describe("todo.util", () => {
  describe("常量", () => {
    it("TODO_TITLE_MAX_LENGTH 为 200", () => {
      expect(TODO_TITLE_MAX_LENGTH).toBe(200);
    });
  });

  describe("validateTodoInput(默认全量模式)", () => {
    it("空 title 返回 title_required", () => {
      expect(validateTodoInput({ title: "" })).toEqual({
        code: "todos.title_required",
      });
    });

    it("纯空白 title 返回 title_required(经 trim)", () => {
      expect(validateTodoInput({ title: "   " })).toEqual({
        code: "todos.title_required",
      });
    });

    it("undefined title 返回 title_required", () => {
      expect(validateTodoInput({})).toEqual({
        code: "todos.title_required",
      });
    });

    it("合法 title 返回 null", () => {
      expect(validateTodoInput({ title: "买牛奶" })).toBeNull();
    });

    it("title 带前后空白但非空合法(经 trim)", () => {
      expect(validateTodoInput({ title: "  买牛奶  " })).toBeNull();
    });

    it("title 超长返回 title_too_long + max 参数", () => {
      const result = validateTodoInput({
        title: "a".repeat(TODO_TITLE_MAX_LENGTH + 1),
      });
      expect(result).toEqual({
        code: "todos.title_too_long",
        params: { max: TODO_TITLE_MAX_LENGTH },
      });
    });

    it("title 恰好等于上限合法", () => {
      expect(
        validateTodoInput({ title: "a".repeat(TODO_TITLE_MAX_LENGTH) }),
      ).toBeNull();
    });
  });

  describe("validateTodoInput(partial 模式)", () => {
    it("partial 模式下 undefined title 不报错(部分更新)", () => {
      expect(validateTodoInput({}, { partial: true })).toBeNull();
    });

    it("partial 模式下空 title 仍报错", () => {
      expect(validateTodoInput({ title: "" }, { partial: true })).toEqual({
        code: "todos.title_required",
      });
    });

    it("partial 模式下超长 title 仍报错", () => {
      expect(
        validateTodoInput(
          { title: "a".repeat(TODO_TITLE_MAX_LENGTH + 1) },
          { partial: true },
        ),
      ).toEqual({
        code: "todos.title_too_long",
        params: { max: TODO_TITLE_MAX_LENGTH },
      });
    });

    it("partial 模式下只更新 completed 合法", () => {
      expect(
        validateTodoInput({ completed: true }, { partial: true }),
      ).toBeNull();
    });
  });
});
