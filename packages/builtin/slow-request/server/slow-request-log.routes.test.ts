import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  mockGetSlowRequestLogs,
  mockGetSlowRequestLogsCount,
  mockGetSlowRequestStats,
} = vi.hoisted(() => ({
  mockGetSlowRequestLogs: vi.fn(),
  mockGetSlowRequestLogsCount: vi.fn(),
  mockGetSlowRequestStats: vi.fn(),
}));

vi.mock("./slow-request.service.js", () => ({
  SlowRequestService: {
    getSlowRequestLogs: (...args: unknown[]) => mockGetSlowRequestLogs(...args),
    getSlowRequestLogsCount: (...args: unknown[]) =>
      mockGetSlowRequestLogsCount(...args),
    getSlowRequestStats: (...args: unknown[]) =>
      mockGetSlowRequestStats(...args),
  },
}));

import {
  createRouteTestApp,
  createTestUserFast,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";

import { slowRequestLogRoutes } from "./slow-request-log.routes.js";

describe("SlowRequestLog Routes", () => {
  let app: TestApp;
  let regularUser: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(slowRequestLogRoutes, {
        prefix: "/api/slow-request-logs",
      });
    });
    regularUser = await createTestUserFast(app, "slow_req_user", "password123");
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

  describe("GET /", () => {
    it("returns paginated slow request logs", async () => {
      mockGetSlowRequestLogs.mockResolvedValue([
        {
          id: "log-1",
          duration_ms: 800,
          status_code: 200,
          route: "/api/notes/:noteId",
          path: "/api/notes/n-1",
          method: "GET",
          tenant_slug: "rewindom",
          user_id: null,
          username: null,
          request_id: "req-1",
          source: "http",
          created_at: new Date().toISOString(),
        },
      ]);
      mockGetSlowRequestLogsCount.mockResolvedValue(1);

      const response = await app.inject({
        method: "GET",
        url: "/api/slow-request-logs?page=1&page_size=20",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.items).toHaveLength(1);
      expect(body.data.total).toBe(1);
      expect(body.data.page).toBe(1);
      expect(body.data.page_size).toBe(20);
    });

    it("forwards query parameters to service", async () => {
      mockGetSlowRequestLogs.mockResolvedValue([]);
      mockGetSlowRequestLogsCount.mockResolvedValue(0);

      await app.inject({
        method: "GET",
        url: "/api/slow-request-logs?route=/api/notes&method=GET&min_duration_ms=500&status_code=200&start_date=2026-01-01&end_date=2026-06-18&page=1&page_size=10",
        headers: authHeaders(regularUser),
      });

      expect(mockGetSlowRequestLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          route: "/api/notes",
          method: "GET",
          min_duration_ms: 500,
          status_code: 200,
          start_date: "2026-01-01",
          end_date: "2026-06-18",
          tenant_slug: "rewindom",
          skip: 0,
          take: 10,
        }),
      );
    });

    it("requires authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/slow-request-logs",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /stats", () => {
    it("returns slow request stats", async () => {
      mockGetSlowRequestStats.mockResolvedValue({
        total_count: 12,
        avg_duration_ms: 700,
        p95_duration_ms: 1400,
        duration_max: 2100,
        by_route: [
          {
            route: "/api/notes/:noteId",
            method: "GET",
            count: 8,
            avg_duration_ms: 900,
            max_duration_ms: 2100,
          },
        ],
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/slow-request-logs/stats",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.total_count).toBe(12);
      expect(body.data.by_route).toHaveLength(1);
    });

    it("requires authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/slow-request-logs/stats",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
