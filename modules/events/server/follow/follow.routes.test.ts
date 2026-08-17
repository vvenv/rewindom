import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// vi.mock 会被提升到文件顶部，工厂里不能引用外层变量——状态对象写在工厂内部
vi.mock("./follow.service.js", () => {
  const following = {
    is_following: true,
    has_update: false,
    last_seen_at: "2025-08-12T12:00:00.000Z",
  };
  return {
    followEvent: vi.fn().mockResolvedValue(following),
    unfollowEvent: vi.fn().mockResolvedValue(undefined),
    markEventSeen: vi.fn().mockResolvedValue(following),
    getFollowState: vi.fn().mockResolvedValue(following),
    countFollowUpdates: vi.fn().mockResolvedValue(3),
  };
});

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";

import { followRoutes } from "./follow.routes.js";

installTestPermissionCatalog([
  { key: "events.read", label: "查看事件", group: "事件雷达" },
  { key: "events.follow", label: "关注事件", group: "事件雷达" },
]);

describe("Follow Routes 权限控制", () => {
  let app: TestApp;
  /** 只有 events.read——能看，但不能关注。 */
  let reader: TestUser;
  /** read + follow。 */
  let follower: TestUser;
  /** 无任何权限。 */
  let outsider: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(followRoutes, { prefix: "/api/events/follows" });
    });

    reader = await createTestUserFast(app, "reader", "password123");
    follower = await createTestUserFast(app, "follower", "password123");
    outsider = await createTestUserFast(app, "outsider", "password123");

    await grantPermission(app, reader.id, "events.read");
    await grantPermission(app, follower.id, "events.read");
    await grantPermission(app, follower.id, "events.follow");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  const WRITE_CALLS = [
    { method: "POST" as const, url: "/api/events/follows/e1" },
    { method: "DELETE" as const, url: "/api/events/follows/e1" },
    { method: "POST" as const, url: "/api/events/follows/e1/seen" },
  ];

  it("未登录读关注状态返回 401", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/events/follows/e1",
    });
    expect(response.statusCode).toBe(401);
  });

  describe("写操作需要 events.follow", () => {
    for (const call of WRITE_CALLS) {
      it(`${call.method} ${call.url} —— 只有 read 的用户被拒`, async () => {
        const response = await app.inject({
          ...call,
          payload: {},
          headers: authHeaders(reader),
        });
        expect(response.statusCode).toBe(403);
      });

      it(`${call.method} ${call.url} —— 有 follow 的用户放行`, async () => {
        const response = await app.inject({
          ...call,
          payload: {},
          headers: authHeaders(follower),
        });
        expect(response.statusCode).toBe(200);
      });
    }
  });

  it("无权限用户读不到关注状态", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/events/follows/e1",
      headers: authHeaders(outsider),
    });
    expect(response.statusCode).toBe(403);
  });

  it("/updates 是静态路径，不会被当成事件 id", async () => {
    const { countFollowUpdates, getFollowState } = await import(
      "./follow.service.js"
    );
    const response = await app.inject({
      method: "GET",
      url: "/api/events/follows/updates",
      headers: authHeaders(reader),
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { count: 3 } });
    expect(countFollowUpdates).toHaveBeenCalled();
    expect(getFollowState).not.toHaveBeenCalledWith(
      expect.objectContaining({ event_id: "updates" }),
    );
  });
});
