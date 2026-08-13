import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("./note.service.js", () => ({
  listNotes: vi.fn().mockResolvedValue({
    items: [],
    page: 1,
    page_size: 20,
    total: 0,
    page_count: 0,
  }),
  getNote: vi.fn().mockResolvedValue({ id: "note-1", title: "n" }),
  createNote: vi.fn().mockResolvedValue({ id: "note-1", title: "n" }),
  updateNote: vi.fn().mockResolvedValue({ id: "note-1", title: "n" }),
  deleteNote: vi.fn().mockResolvedValue(undefined),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";

import { noteRoutes } from "./note.routes.js";

installTestPermissionCatalog([
  { key: "note.read", label: "查看笔记", group: "笔记" },
  { key: "note.write", label: "创建/编辑笔记", group: "笔记" },
]);

describe("Note Routes 权限控制", () => {
  let app: TestApp;
  /** 系统管理员：不授予任何角色，默认应拥有全部权限。 */
  let systemAdmin: TestUser;
  /** 只有 note.read。 */
  let reader: TestUser;
  /** 无任何权限。 */
  let outsider: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(noteRoutes, { prefix: "/api/notes" });
    });

    systemAdmin = await createTestUserFast(app, "sysadmin", "password123", {
      is_system_admin: true,
    });
    reader = await createTestUserFast(app, "reader", "password123");
    outsider = await createTestUserFast(app, "outsider", "password123");

    await grantPermission(app, reader.id, "note.read");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  describe("未携带 Authorization 头", () => {
    it("列表返回 401", async () => {
      const response = await app.inject({ method: "GET", url: "/api/notes/" });
      expect(response.statusCode).toBe(401);
    });

    it("创建返回 401", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/notes/",
        payload: { title: "t" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("Bearer 之外的凭据同样按未授权处理", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notes/",
        headers: { authorization: "Basic dXNlcjpwYXNz" },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("note.read", () => {
    it("无权限用户读取返回 403", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notes/",
        headers: authHeaders(outsider),
      });
      expect(response.statusCode).toBe(403);
    });

    it("有 note.read 的用户可读取", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notes/",
        headers: authHeaders(reader),
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("note.write", () => {
    it("只有 note.read 的用户写入返回 403", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/notes/",
        headers: authHeaders(reader),
        payload: { title: "t" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("只有 note.read 的用户删除返回 403", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/notes/note-1",
        headers: authHeaders(reader),
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe("系统管理员默认拥有全部权限", () => {
    it("未分配任何角色也能读取", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notes/",
        headers: authHeaders(systemAdmin),
      });
      expect(response.statusCode).toBe(200);
    });

    it("未分配任何角色也能写入", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/notes/",
        headers: authHeaders(systemAdmin),
        payload: { title: "t" },
      });
      expect(response.statusCode).toBe(200);
    });

    it("未分配任何角色也能删除", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/notes/note-1",
        headers: authHeaders(systemAdmin),
      });
      expect(response.statusCode).toBe(200);
    });
  });
});
