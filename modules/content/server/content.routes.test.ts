import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("./content.service.js", () => ({
  listContents: vi.fn().mockResolvedValue({
    items: [],
    page: 1,
    page_size: 20,
    total: 0,
    page_count: 0,
  }),
  getContent: vi.fn().mockResolvedValue({ id: "content-1", title: "n" }),
  createContent: vi.fn().mockResolvedValue({ id: "content-1", title: "n" }),
  updateContent: vi.fn().mockResolvedValue({ id: "content-1", title: "n" }),
  deleteContent: vi.fn().mockResolvedValue(undefined),
  enqueueContentGeneration: vi.fn().mockResolvedValue({
    id: "content-1",
    title: "n",
    status: "generating",
  }),
}));

vi.mock("./content-asset.service.js", () => ({
  addContentFileAsset: vi.fn(),
  addContentTextAsset: vi.fn().mockResolvedValue({ id: "asset-1" }),
  deleteContentAsset: vi.fn().mockResolvedValue(undefined),
  getContentAssetRecord: vi.fn(),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";

import { contentRoutes } from "./content.routes.js";

installTestPermissionCatalog([
  { key: "contents.read", label: "查看内容", group: "内容生成" },
  { key: "contents.write", label: "创建/编辑内容", group: "内容生成" },
]);

describe("Content Routes 权限控制", () => {
  let app: TestApp;
  let systemAdmin: TestUser;
  let reader: TestUser;
  let outsider: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(contentRoutes, { prefix: "/api/contents" });
    });

    systemAdmin = await createTestUserFast(app, "sysadmin", "password123", {
      is_system_admin: true,
    });
    reader = await createTestUserFast(app, "reader", "password123");
    outsider = await createTestUserFast(app, "outsider", "password123");

    await grantPermission(app, reader.id, "contents.read");
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
        url: "/api/contents/",
      });
      expect(response.statusCode).toBe(401);
    });

    it("创建返回 401", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/contents/",
        payload: { brief: "t" },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("contents.read", () => {
    it("无权限用户读取返回 403", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/contents/",
        headers: authHeaders(outsider),
      });
      expect(response.statusCode).toBe(403);
    });

    it("有 contents.read 的用户可读取", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/contents/",
        headers: authHeaders(reader),
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("contents.write", () => {
    it("只有 contents.read 的用户写入返回 403", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/contents/",
        headers: authHeaders(reader),
        payload: { brief: "t" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("只有 contents.read 的用户不能触发生成", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/contents/content-1/generate",
        headers: authHeaders(reader),
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe("系统管理员默认拥有全部权限", () => {
    it("未分配任何角色也能读取", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/contents/",
        headers: authHeaders(systemAdmin),
      });
      expect(response.statusCode).toBe(200);
    });

    it("未分配任何角色也能写入", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/contents/",
        headers: authHeaders(systemAdmin),
        payload: { brief: "t" },
      });
      expect(response.statusCode).toBe(200);
    });
  });
});
