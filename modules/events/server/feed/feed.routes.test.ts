import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./feed.service.js", () => ({
  listEventFeeds: vi.fn().mockResolvedValue({ items: [] }),
  createEventFeed: vi.fn().mockResolvedValue({ id: "f1", name: "HN" }),
  updateEventFeed: vi.fn().mockResolvedValue({ id: "f1", name: "HN" }),
  deleteEventFeed: vi.fn().mockResolvedValue(undefined),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";

import { feedRoutes } from "./feed.routes.js";

installTestPermissionCatalog([
  { key: "events.read", label: "查看事件", group: "事件雷达" },
  { key: "events.write", label: "管理事件", group: "事件雷达" },
]);

describe("Event feed routes 权限控制", () => {
  let app: TestApp;
  let reader: TestUser;
  let writer: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(feedRoutes, { prefix: "/api/events/feeds" });
    });

    reader = await createTestUserFast(app, "feed-reader", "password123");
    writer = await createTestUserFast(app, "feed-writer", "password123");
    await grantPermission(app, reader.id, "events.read");
    await grantPermission(app, writer.id, "events.read");
    await grantPermission(app, writer.id, "events.write");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  it("GET /feeds 有 read 即可", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/events/feeds/",
      headers: authHeaders(reader),
    });
    expect(response.statusCode).toBe(200);
  });

  it("POST /feeds 只有 read 被拒，write 放行", async () => {
    const denied = await app.inject({
      method: "POST",
      url: "/api/events/feeds/",
      payload: { name: "X", connector: "rss", url: "https://example.com/feed.xml" },
      headers: authHeaders(reader),
    });
    expect(denied.statusCode).toBe(403);

    const allowed = await app.inject({
      method: "POST",
      url: "/api/events/feeds/",
      payload: { name: "X", connector: "rss", url: "https://example.com/feed.xml" },
      headers: authHeaders(writer),
    });
    expect(allowed.statusCode).toBe(200);
  });
});
