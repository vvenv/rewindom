import { installTestPermissionCatalog } from "@be-water/server-test/permission-catalog";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("./bookmark.service.js", () => ({
  listBookmarks: vi.fn().mockResolvedValue({
    items: [],
    page: 1,
    page_size: 20,
    total: 0,
    page_count: 0,
  }),
  listBookmarkHosts: vi.fn().mockResolvedValue([]),
  getBookmark: vi
    .fn()
    .mockResolvedValue({ id: "bookmark-1", title: "b", url: "https://e.com/" }),
  createBookmark: vi
    .fn()
    .mockResolvedValue({ id: "bookmark-1", title: "b", url: "https://e.com/" }),
  updateBookmark: vi
    .fn()
    .mockResolvedValue({ id: "bookmark-1", title: "b", url: "https://e.com/" }),
  deleteBookmark: vi.fn().mockResolvedValue(undefined),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@be-water/server-test";

import { bookmarkRoutes } from "./bookmark.routes.js";

installTestPermissionCatalog([
  { key: "bookmark.read", label: "查看书签", group: "书签" },
  { key: "bookmark.write", label: "创建/编辑书签", group: "书签" },
]);

describe("Bookmark Routes 权限控制", () => {
  let app: TestApp;
  /** 系统管理员：不授予任何角色，默认应拥有全部权限。 */
  let systemAdmin: TestUser;
  /** 只有 bookmark.read。 */
  let reader: TestUser;
  /** 无任何权限。 */
  let outsider: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(bookmarkRoutes, { prefix: "/api/bookmarks" });
    });

    systemAdmin = await createTestUserFast(app, "sysadmin", "password123", {
      is_system_admin: true,
    });
    reader = await createTestUserFast(app, "reader", "password123");
    outsider = await createTestUserFast(app, "outsider", "password123");

    await grantPermission(app, reader.id, "bookmark.read");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  describe("未携带 Authorization 头", () => {
    it("列表返回 401", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/bookmarks/",
      });
      expect(response.statusCode).toBe(401);
    });

    it("创建返回 401", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookmarks/",
        payload: { url: "https://example.com" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("Bearer 之外的凭据同样按未授权处理", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/bookmarks/",
        headers: { authorization: "Basic dXNlcjpwYXNz" },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("bookmark.read", () => {
    it("无权限用户读取返回 403", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/bookmarks/",
        headers: authHeaders(outsider),
      });
      expect(response.statusCode).toBe(403);
    });

    it("有 bookmark.read 的用户可读取", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/bookmarks/",
        headers: authHeaders(reader),
      });
      expect(response.statusCode).toBe(200);
    });

    it("站点分组同样受 bookmark.read 保护", async () => {
      const denied = await app.inject({
        method: "GET",
        url: "/api/bookmarks/hosts",
        headers: authHeaders(outsider),
      });
      expect(denied.statusCode).toBe(403);

      const allowed = await app.inject({
        method: "GET",
        url: "/api/bookmarks/hosts",
        headers: authHeaders(reader),
      });
      expect(allowed.statusCode).toBe(200);
      expect(allowed.json()).toEqual({ data: { items: [] } });
    });
  });

  describe("bookmark.write", () => {
    it("只有 bookmark.read 的用户写入返回 403", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookmarks/",
        headers: authHeaders(reader),
        payload: { url: "https://example.com" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("只有 bookmark.read 的用户更新返回 403", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/bookmarks/bookmark-1",
        headers: authHeaders(reader),
        payload: { title: "t" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("只有 bookmark.read 的用户删除返回 403", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/bookmarks/bookmark-1",
        headers: authHeaders(reader),
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe("系统管理员默认拥有全部权限", () => {
    it("未分配任何角色也能读取", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/bookmarks/",
        headers: authHeaders(systemAdmin),
      });
      expect(response.statusCode).toBe(200);
    });

    it("未分配任何角色也能写入", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/bookmarks/",
        headers: authHeaders(systemAdmin),
        payload: { url: "https://example.com" },
      });
      expect(response.statusCode).toBe(200);
    });

    it("未分配任何角色也能删除", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/bookmarks/bookmark-1",
        headers: authHeaders(systemAdmin),
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("`/hosts` 不被 `/:bookmark_id` 抢走", () => {
    it("命中 hosts 路由而非详情路由", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/bookmarks/hosts",
        headers: authHeaders(systemAdmin),
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ data: { items: [] } });
    });
  });
});
