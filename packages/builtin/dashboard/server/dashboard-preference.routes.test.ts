import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPreference = vi.fn();
const mockSavePreference = vi.fn();
const mockResetPreference = vi.fn();

vi.mock("./dashboard-preference.service.js", () => ({
  getDashboardPreference: (...args: unknown[]) => mockGetPreference(...args),
  saveDashboardPreference: (...args: unknown[]) => mockSavePreference(...args),
  resetDashboardPreference: (...args: unknown[]) => mockResetPreference(...args),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  type TestApp,
  type TestUser,
} from "@be-water/server-test";

import { dashboardPreferenceRoutes } from "./dashboard-preference.routes.js";

const EMPTY = { hidden_widgets: [], widget_order: [], updated_at: null };

describe("Dashboard preference routes", () => {
  let app: TestApp;
  let user: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(dashboardPreferenceRoutes, {
        prefix: "/api/dashboard",
      });
    });
    user = await createTestUserFast(app, "dashboard_user", "password123");
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function authHeaders(testUser: TestUser) {
    return { authorization: `Bearer ${testUser.accessToken}` };
  }

  it("GET returns the empty preference for a user who never configured anything", async () => {
    mockGetPreference.mockResolvedValueOnce(EMPTY);

    const response = await app.inject({
      method: "GET",
      url: "/api/dashboard/preferences",
      headers: authHeaders(user),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).data).toEqual(EMPTY);
  });

  it("rejects anonymous access", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/dashboard/preferences",
    });

    expect(response.statusCode).toBe(401);
    expect(mockGetPreference).not.toHaveBeenCalled();
  });

  it("PUT saves against the session's own user, ignoring ids in the body", async () => {
    mockSavePreference.mockResolvedValueOnce({
      ...EMPTY,
      hidden_widgets: ["note.recent"],
      widget_order: ["todo.pending", "note.recent"],
      updated_at: "2026-08-10T00:00:00.000Z",
    });

    const response = await app.inject({
      method: "PUT",
      url: "/api/dashboard/preferences",
      headers: authHeaders(user),
      payload: {
        hidden_widgets: ["note.recent", "note.recent"],
        widget_order: ["todo.pending", "note.recent"],
        user_id: "someone-else",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockSavePreference).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      user.id,
      // 请求体先过 normalize：重复 id 去掉，user_id 之类的字段整个丢弃
      {
        hidden_widgets: ["note.recent"],
        widget_order: ["todo.pending", "note.recent"],
      },
    );
  });

  it("PUT tolerates a garbage body instead of 500-ing", async () => {
    mockSavePreference.mockResolvedValueOnce(EMPTY);

    const response = await app.inject({
      method: "PUT",
      url: "/api/dashboard/preferences",
      headers: authHeaders(user),
      payload: { hidden_widgets: "nope", widget_order: 42 },
    });

    expect(response.statusCode).toBe(200);
    expect(mockSavePreference).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      user.id,
      { hidden_widgets: [], widget_order: [] },
    );
  });

  it("DELETE resets to the module defaults", async () => {
    mockResetPreference.mockResolvedValueOnce(EMPTY);

    const response = await app.inject({
      method: "DELETE",
      url: "/api/dashboard/preferences",
      headers: authHeaders(user),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).data).toEqual(EMPTY);
    expect(mockResetPreference).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      user.id,
    );
  });
});
