import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("./catalog.service.js", () => ({
  listProducts: vi.fn().mockResolvedValue({
    items: [],
    page: 1,
    page_size: 20,
    total: 0,
    page_count: 0,
  }),
  getProduct: vi.fn().mockResolvedValue({ id: "p1", slug: "mug" }),
  createProduct: vi.fn().mockResolvedValue({ id: "p1", slug: "mug" }),
  updateProduct: vi.fn().mockResolvedValue({ id: "p1", slug: "mug" }),
  deleteProduct: vi.fn().mockResolvedValue(undefined),
  addVariant: vi.fn(),
  updateVariant: vi.fn(),
  deleteVariant: vi.fn(),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";

import { catalogRoutes } from "./catalog.routes.js";

installTestPermissionCatalog([
  { key: "shop.read", label: "查看商店", group: "商店" },
  { key: "shop.write", label: "管理商店", group: "商店" },
]);

describe("Shop catalog routes 权限控制", () => {
  let app: TestApp;
  let systemAdmin: TestUser;
  let reader: TestUser;
  let outsider: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(catalogRoutes, { prefix: "/api/shop" });
    });

    systemAdmin = await createTestUserFast(app, "sysadmin", "password123", {
      is_system_admin: true,
    });
    reader = await createTestUserFast(app, "reader", "password123");
    outsider = await createTestUserFast(app, "outsider", "password123");

    await grantPermission(app, reader.id, "shop.read");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  it("未携带 Authorization 头列表返回 401", async () => {
    const response = await app.inject({ method: "GET", url: "/api/shop/products" });
    expect(response.statusCode).toBe(401);
  });

  it("无权限用户读取返回 403", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/shop/products",
      headers: authHeaders(outsider),
    });
    expect(response.statusCode).toBe(403);
  });

  it("有 shop.read 的用户可读取", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/shop/products",
      headers: authHeaders(reader),
    });
    expect(response.statusCode).toBe(200);
  });

  it("只有 shop.read 的用户写入返回 403", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/shop/products",
      headers: authHeaders(reader),
      payload: { title: { "zh-CN": "杯" }, slug: "mug", variant: { sku: "M1", price_cents: 100, stock_qty: 1 } },
    });
    expect(response.statusCode).toBe(403);
  });

  it("系统管理员未分配角色也能写入", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/shop/products",
      headers: authHeaders(systemAdmin),
      payload: { title: { "zh-CN": "杯" }, slug: "mug", variant: { sku: "M1", price_cents: 100, stock_qty: 1 } },
    });
    expect(response.statusCode).toBe(200);
  });
});
