import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./event/event.service.js", () => ({
  listEvents: vi.fn().mockResolvedValue({
    items: [],
    page: 1,
    page_size: 20,
    total: 0,
    page_count: 0,
  }),
  getEventFeed: vi
    .fn()
    .mockResolvedValue({ rising: [], now: [], today: [], today_total: 0 }),
  getEventDetail: vi.fn().mockResolvedValue({ id: "e1", title: "t" }),
  listTopicCounts: vi.fn().mockResolvedValue([]),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";

import { eventsRoutes } from "./events.routes.js";

installTestPermissionCatalog([
  { key: "events.read", label: "查看事件", group: "事件雷达" },
  { key: "events.follow", label: "关注事件", group: "事件雷达" },
]);

describe("Events Routes 权限控制", () => {
  let app: TestApp;
  /** 系统管理员：不授予任何角色，默认应拥有全部权限。 */
  let systemAdmin: TestUser;
  /** 只有 events.read。 */
  let reader: TestUser;
  /** 无任何权限。 */
  let outsider: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(eventsRoutes, { prefix: "/api/events" });
    });

    systemAdmin = await createTestUserFast(app, "sysadmin", "password123", {
      is_system_admin: true,
    });
    reader = await createTestUserFast(app, "reader", "password123");
    outsider = await createTestUserFast(app, "outsider", "password123");

    await grantPermission(app, reader.id, "events.read");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  const READ_URLS = [
    "/api/events/",
    "/api/events/feed",
    "/api/events/topics",
    "/api/events/some-event",
  ];

  describe("未携带 Authorization 头", () => {
    for (const url of READ_URLS) {
      it(`${url} 返回 401`, async () => {
        const response = await app.inject({ method: "GET", url });
        expect(response.statusCode).toBe(401);
      });
    }
  });

  describe("无权限用户", () => {
    for (const url of READ_URLS) {
      it(`${url} 返回 403`, async () => {
        const response = await app.inject({
          method: "GET",
          url,
          headers: authHeaders(outsider),
        });
        expect(response.statusCode).toBe(403);
      });
    }
  });

  describe("持有 events.read", () => {
    for (const url of READ_URLS) {
      it(`${url} 放行`, async () => {
        const response = await app.inject({
          method: "GET",
          url,
          headers: authHeaders(reader),
        });
        expect(response.statusCode).toBe(200);
      });
    }
  });

  it("系统管理员无需显式授权即可读取", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/events/",
      headers: authHeaders(systemAdmin),
    });
    expect(response.statusCode).toBe(200);
  });

  it("静态路径优先于 :eventId —— /topics 不会被当成事件 id", async () => {
    const { listTopicCounts, getEventDetail } = await import(
      "./event/event.service.js"
    );
    await app.inject({
      method: "GET",
      url: "/api/events/topics",
      headers: authHeaders(reader),
    });
    expect(listTopicCounts).toHaveBeenCalled();
    expect(getEventDetail).not.toHaveBeenCalledWith(
      expect.objectContaining({ event_id: "topics" }),
    );
  });
});
