import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from "vitest";

const { mockListIpRules, mockCreateIpRule, mockGetTopTrafficSources } =
  vi.hoisted(() => ({
    mockListIpRules: vi.fn(),
    mockCreateIpRule: vi.fn(),
    mockGetTopTrafficSources: vi.fn(),
  }));

vi.mock("./ip-access.service.js", () => ({
  listIpRules: mockListIpRules,
  createIpRule: mockCreateIpRule,
  updateIpRule: vi.fn().mockResolvedValue({ id: "r1", cidr: "203.0.113.0/24" }),
  deleteIpRule: vi.fn().mockResolvedValue({ id: "r1", cidr: "203.0.113.0/24" }),
}));

vi.mock("./traffic-stats.service.js", () => ({
  getTopTrafficSources: mockGetTopTrafficSources,
  getTrafficWindowMinutes: () => 60,
}));

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";

import { ipAccessRoutes } from "./ip-access.routes.js";

installTestPermissionCatalog([
  { key: "ip_access.read", label: "查看访问规则", group: "访问控制" },
  { key: "ip_access.write", label: "管理访问规则", group: "访问控制" },
]);

describe("IP Access 租户路由", () => {
  let app: TestApp;
  let reader: TestUser;
  let writer: TestUser;
  let outsider: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(ipAccessRoutes, { prefix: "/api/ip-rules" });
    });

    reader = await createTestUserFast(app, "ip-reader", "password123");
    writer = await createTestUserFast(app, "ip-writer", "password123");
    outsider = await createTestUserFast(app, "ip-outsider", "password123");

    await grantPermission(app, reader.id, "ip_access.read");
    await grantPermission(app, writer.id, "ip_access.read");
    await grantPermission(app, writer.id, "ip_access.write");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  beforeEach(() => {
    mockListIpRules.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
      page_count: 0,
    });
    mockCreateIpRule.mockResolvedValue({
      id: "r1",
      cidr: "203.0.113.0/24",
      action: "block",
      mode: "log_only",
    });
    mockGetTopTrafficSources.mockResolvedValue([]);
  });

  describe("未认证", () => {
    it("列表返回 401", async () => {
      const res = await app.inject({ method: "GET", url: "/api/ip-rules/" });
      expect(res.statusCode).toBe(401);
    });

    it("访问来源返回 401", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/ip-rules/traffic",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("ip_access.read", () => {
    it("无权限用户读取返回 403", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/ip-rules/",
        headers: authHeaders(outsider),
      });
      expect(res.statusCode).toBe(403);
    });

    it("有读权限即可查看列表与访问来源", async () => {
      for (const url of ["/api/ip-rules/", "/api/ip-rules/traffic"]) {
        const res = await app.inject({
          method: "GET",
          url,
          headers: authHeaders(reader),
        });
        expect(res.statusCode).toBe(200);
      }
    });
  });

  describe("ip_access.write", () => {
    it("只读用户创建返回 403", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/ip-rules/",
        headers: authHeaders(reader),
        payload: { cidr: "203.0.113.0/24", reason: "扫描" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("只读用户删除返回 403", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/ip-rules/r1",
        headers: authHeaders(reader),
      });
      expect(res.statusCode).toBe(403);
    });

    it("有写权限可创建", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/ip-rules/",
        headers: authHeaders(writer),
        payload: { cidr: "203.0.113.0/24", reason: "扫描" },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("作用域", () => {
    it("列表强制按调用者的站点过滤", async () => {
      await app.inject({
        method: "GET",
        url: "/api/ip-rules/",
        headers: authHeaders(reader),
      });
      const scope = mockListIpRules.mock.calls.at(-1)?.[0]?.scope as {
        kind: string;
      };
      expect(scope.kind).toBe("tenant");
    });

    it("创建的规则只作用于调用者的站点，body 里传什么都无效", async () => {
      // 租户面若能造出平台规则，就等于绕过了平台的处置权
      await app.inject({
        method: "POST",
        url: "/api/ip-rules/",
        headers: authHeaders(writer),
        payload: {
          cidr: "203.0.113.0/24",
          reason: "扫描",
          scope: { kind: "platform" },
          tenant_id: null,
        },
      });
      const params = mockCreateIpRule.mock.calls.at(-1)?.[0] as {
        scope: { kind: string };
      };
      expect(params.scope.kind).toBe("tenant");
    });

    it("访问来源只返回本站点的流量", async () => {
      await app.inject({
        method: "GET",
        url: "/api/ip-rules/traffic",
        headers: authHeaders(reader),
      });
      const [, tenantId] = mockGetTopTrafficSources.mock.calls.at(-1) ?? [];
      expect(typeof tenantId).toBe("string");
      expect(tenantId).not.toBeNull();
    });
  });
});
