import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("./content-template.service.js", () => ({
  listContentTemplates: vi.fn().mockResolvedValue([]),
  getContentTemplate: vi
    .fn()
    .mockResolvedValue({ id: "tpl-1", name: "小红书笔记" }),
  createContentTemplate: vi
    .fn()
    .mockResolvedValue({ id: "tpl-1", name: "小红书笔记" }),
  createContentTemplateFromPreset: vi
    .fn()
    .mockResolvedValue({ id: "tpl-2", name: "小红书笔记" }),
  updateContentTemplate: vi
    .fn()
    .mockResolvedValue({ id: "tpl-1", name: "小红书笔记" }),
  deleteContentTemplate: vi.fn().mockResolvedValue(undefined),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";

import { contentTemplateRoutes } from "./content-template.routes.js";

installTestPermissionCatalog([
  { key: "contents.read", label: "查看内容", group: "内容生成" },
  { key: "contents.write", label: "创建/编辑内容", group: "内容生成" },
]);

/**
 * 模板复用内容的两个权限键，所以这里守的是「读写没有被写反」：
 * 能看内容的人就能看模板，但改模板必须要写权限。
 */
describe("Content Template Routes 权限控制", () => {
  let app: TestApp;
  let reader: TestUser;
  let writer: TestUser;
  let outsider: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(contentTemplateRoutes, {
        prefix: "/api/content-templates",
      });
    });

    reader = await createTestUserFast(app, "tpl-reader", "password123");
    writer = await createTestUserFast(app, "tpl-writer", "password123");
    outsider = await createTestUserFast(app, "tpl-outsider", "password123");

    await grantPermission(app, reader.id, "contents.read");
    await grantPermission(app, writer.id, "contents.read");
    await grantPermission(app, writer.id, "contents.write");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  it("未登录读列表返回 401", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/content-templates/",
    });
    expect(response.statusCode).toBe(401);
  });

  it("无权限用户读列表返回 403", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/content-templates/",
      headers: authHeaders(outsider),
    });
    expect(response.statusCode).toBe(403);
  });

  it("有 contents.read 就能看模板与内置预设", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/api/content-templates/",
      headers: authHeaders(reader),
    });
    expect(list.statusCode).toBe(200);

    const presets = await app.inject({
      method: "GET",
      url: "/api/content-templates/presets",
      headers: authHeaders(reader),
    });
    expect(presets.statusCode).toBe(200);
    // 预设是代码里的常量，任何租户都拿得到同一份
    expect(JSON.parse(presets.body).data.length).toBeGreaterThan(0);
  });

  it("只读用户改不了模板", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/content-templates/",
      headers: authHeaders(reader),
      payload: { name: "x", fields: [] },
    });
    expect(created.statusCode).toBe(403);

    const deleted = await app.inject({
      method: "DELETE",
      url: "/api/content-templates/tpl-1",
      headers: authHeaders(reader),
    });
    expect(deleted.statusCode).toBe(403);
  });

  it("有 contents.write 就能建模板，也能复制内置预设", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/content-templates/",
      headers: authHeaders(writer),
      payload: { name: "小红书笔记", fields: [] },
    });
    expect(created.statusCode).toBe(200);

    const copied = await app.inject({
      method: "POST",
      url: "/api/content-templates/",
      headers: authHeaders(writer),
      payload: { preset_key: "xhs-note" },
    });
    expect(copied.statusCode).toBe(200);
    expect(JSON.parse(copied.body).data.id).toBe("tpl-2");
  });

  it("`presets` 不会被当成一个模板 id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/content-templates/presets",
      headers: authHeaders(reader),
    });
    expect(Array.isArray(JSON.parse(response.body).data)).toBe(true);
  });
});
