import { installTestPermissionCatalog } from "@be-water/server-test/permission-catalog";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("./todo.service.js", () => ({
  listTodos: vi.fn().mockResolvedValue({
    items: [],
    page: 1,
    page_size: 20,
    total: 0,
    page_count: 0,
  }),
  getTodo: vi.fn().mockResolvedValue({ id: "todo-1", title: "t" }),
  createTodo: vi.fn().mockResolvedValue({ id: "todo-1", title: "t" }),
  updateTodo: vi.fn().mockResolvedValue({ id: "todo-1", title: "t" }),
  deleteTodo: vi.fn().mockResolvedValue(undefined),
  clearCompletedTodos: vi.fn().mockResolvedValue(3),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@be-water/server-test";

import { todoRoutes } from "./todo.routes.js";
import { clearCompletedTodos, listTodos } from "./todo.service.js";

installTestPermissionCatalog([
  { key: "todos.read", label: "查看待办", group: "待办" },
  { key: "todos.write", label: "创建/编辑待办", group: "待办" },
]);

describe("Todo Routes", () => {
  let app: TestApp;
  let reader: TestUser;
  let writer: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(todoRoutes, { prefix: "/api/todos" });
    });

    reader = await createTestUserFast(app, "todo-reader", "password123");
    writer = await createTestUserFast(app, "todo-writer", "password123");

    await grantPermission(app, reader.id, "todos.read");
    await grantPermission(app, writer.id, "todos.read");
    await grantPermission(app, writer.id, "todos.write");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  describe("状态筛选", () => {
    it("completed=true / false 透传为布尔值", async () => {
      await app.inject({
        method: "GET",
        url: "/api/todos/?completed=true",
        headers: authHeaders(reader),
      });
      expect(vi.mocked(listTodos).mock.calls.at(-1)?.[0]).toMatchObject({
        completed: true,
      });

      await app.inject({
        method: "GET",
        url: "/api/todos/?completed=false",
        headers: authHeaders(reader),
      });
      expect(vi.mocked(listTodos).mock.calls.at(-1)?.[0]).toMatchObject({
        completed: false,
      });
    });

    it("缺省或非法值一律当「全部」", async () => {
      await app.inject({
        method: "GET",
        url: "/api/todos/",
        headers: authHeaders(reader),
      });
      expect(
        vi.mocked(listTodos).mock.calls.at(-1)?.[0].completed,
      ).toBeUndefined();

      await app.inject({
        method: "GET",
        url: "/api/todos/?completed=yes",
        headers: authHeaders(reader),
      });
      expect(
        vi.mocked(listTodos).mock.calls.at(-1)?.[0].completed,
      ).toBeUndefined();
    });
  });

  describe("DELETE /completed", () => {
    // 静态段必须赢过 /:todo_id，否则「清除已完成」会变成删除 id 为 "completed" 的那条
    it("走清除批量操作而非按 id 删除", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/todos/completed",
        headers: authHeaders(writer),
      });

      expect(response.statusCode).toBe(200);
      // API 约定：成功响应统一包一层 { data: T }
      expect(response.json()).toEqual({ data: { deleted: 3 } });
      expect(vi.mocked(clearCompletedTodos)).toHaveBeenCalled();
    });

    it("只有 todos.read 的用户返回 403", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/todos/completed",
        headers: authHeaders(reader),
      });
      expect(response.statusCode).toBe(403);
    });

    it("未登录返回 401", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/todos/completed",
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
