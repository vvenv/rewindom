import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";


const { mockGetSlowQueryLogs, mockGetSlowQueryLogsCount, mockGetSlowQueryStats } =
  vi.hoisted(() => ({
    mockGetSlowQueryLogs: vi.fn(),
    mockGetSlowQueryLogsCount: vi.fn(),
    mockGetSlowQueryStats: vi.fn(),
  }));

vi.mock("./slow-query.service.js", () => ({
  SlowQueryService: {
    getSlowQueryLogs: (...args: unknown[]) => mockGetSlowQueryLogs(...args),
    getSlowQueryLogsCount: (...args: unknown[]) =>
      mockGetSlowQueryLogsCount(...args),
    getSlowQueryStats: (...args: unknown[]) => mockGetSlowQueryStats(...args),
  },
}));

import {
  createRouteTestApp,
  createTestUserFast,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";

import { slowQueryLogRoutes } from "./slow-query-log.routes.js";

describe("SlowQueryLog Routes", () => {
  let app: TestApp;
  let regularUser: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(slowQueryLogRoutes, {
        prefix: "/api/slow-query-logs",
      });
    });
    regularUser = await createTestUserFast(app, "slow_user", "password123");
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
    it("returns paginated slow query logs", async () => {
      mockGetSlowQueryLogs.mockResolvedValue([
        {
          id: "log-1",
          duration_ms: 500,
          query: 'SELECT * FROM "Order"',
          params: null,
          fingerprint: "SELECT * FROM ORDER",
          target: null,
          route: "/api/orders",
          method: "GET",
          tenant_slug: "rewindom",
          user_id: null,
          username: null,
          request_id: "req-1",
          source: "http",
          created_at: new Date().toISOString(),
        },
      ]);
      mockGetSlowQueryLogsCount.mockResolvedValue(1);

      const response = await app.inject({
        method: "GET",
        url: "/api/slow-query-logs?page=1&page_size=20",
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
      mockGetSlowQueryLogs.mockResolvedValue([]);
      mockGetSlowQueryLogsCount.mockResolvedValue(0);

      await app.inject({
        method: "GET",
        url: "/api/slow-query-logs?route=/api/orders&fingerprint=SELECT&min_duration_ms=500&source=http&start_date=2026-01-01&end_date=2026-06-18&page=1&page_size=10",
        headers: authHeaders(regularUser),
      });

      expect(mockGetSlowQueryLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          route: "/api/orders",
          fingerprint: "SELECT",
          min_duration_ms: 500,
          source: "http",
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
        url: "/api/slow-query-logs",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /stats", () => {
    it("returns slow query stats", async () => {
      mockGetSlowQueryStats.mockResolvedValue({
        total_count: 100,
        avg_duration_ms: 500,
        p95_duration_ms: 1200,
        duration_max: 3000,
        by_route: [
          { route: "/api/orders", count: 80, avg_duration_ms: 600 },
        ],
        by_fingerprint: [
          {
            fingerprint: "SELECT * FROM ORDER",
            count: 80,
            max_duration_ms: 3000,
            avg_duration_ms: 600,
          },
        ],
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/slow-query-logs/stats",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.total_count).toBe(100);
      expect(body.data.avg_duration_ms).toBe(500);
      expect(body.data.p95_duration_ms).toBe(1200);
      expect(body.data.by_route).toHaveLength(1);
    });

    it("requires authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/slow-query-logs/stats",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
