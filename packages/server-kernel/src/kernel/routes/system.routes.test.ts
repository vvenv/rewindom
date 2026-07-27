import { createRouteTestApp, type TestApp } from "@be-water/server-test";
import { describe, it, expect, beforeAll, afterAll } from "vitest";


import { systemRoutes } from "./system.routes.js";

describe("System Routes", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(systemRoutes, { prefix: "/api" });
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/system-info", () => {
    it("should return version without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/system-info",
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("version");
      expect(typeof data.version).toBe("string");
      expect(data.version.length).toBeGreaterThan(0);
    });
  });
});
