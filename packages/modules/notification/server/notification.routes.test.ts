import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";

const mockListNotifications = vi.fn();
const mockGetUnreadCount = vi.fn();
const mockMarkNotificationRead = vi.fn();
const mockMarkAllNotificationsRead = vi.fn();

vi.mock("./notification.service.js", () => ({
  listNotifications: (...args: unknown[]) => mockListNotifications(...args),
  getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  markNotificationRead: (...args: unknown[]) =>
    mockMarkNotificationRead(...args),
  markAllNotificationsRead: (...args: unknown[]) =>
    mockMarkAllNotificationsRead(...args),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  type TestApp,
  type TestUser,
} from "@be-water/server-test";

import { notificationRoutes } from "./notification.routes.js";

describe("Notification Routes", () => {
  let app: TestApp;
  let regularUser: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(notificationRoutes, {
        prefix: "/api/notifications",
      });
    });
    regularUser = await createTestUserFast(app, "notify_user", "password123");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/notifications returns paginated list", async () => {
    mockListNotifications.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/notifications?page=1&page_size=20",
      headers: authHeaders(regularUser),
    });

    expect(response.statusCode).toBe(200);
    const { data } = JSON.parse(response.payload);
    expect(data.total).toBe(0);
    expect(mockListNotifications).toHaveBeenCalled();
  });

  it("GET /api/notifications/unread-count returns unread summary", async () => {
    mockGetUnreadCount.mockResolvedValueOnce({
      total: 2,
      by_severity: { info: 1, warning: 1, critical: 0 },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/notifications/unread-count",
      headers: authHeaders(regularUser),
    });

    expect(response.statusCode).toBe(200);
    const { data } = JSON.parse(response.payload);
    expect(data.total).toBe(2);
  });

  it("PATCH /api/notifications/:id/read marks notification read", async () => {
    mockMarkNotificationRead.mockResolvedValueOnce({
      id: "n1",
      type: "document_processed",
      severity: "info",
      title: "t",
      body: "b",
      link_path: null,
      metadata: null,
      read_at: "2026-06-12T10:00:00.000Z",
      created_at: "2026-06-12T09:00:00.000Z",
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/notifications/n1/read",
      headers: authHeaders(regularUser),
    });

    expect(response.statusCode).toBe(200);
    expect(mockMarkNotificationRead).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      regularUser.id,
      "n1",
    );
  });

  it("POST /api/notifications/read-all marks all read", async () => {
    mockMarkAllNotificationsRead.mockResolvedValueOnce({ updated_count: 3 });

    const response = await app.inject({
      method: "POST",
      url: "/api/notifications/read-all",
      headers: authHeaders(regularUser),
    });

    expect(response.statusCode).toBe(200);
    const { data } = JSON.parse(response.payload);
    expect(data.updated_count).toBe(3);
  });
});
