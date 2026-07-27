import { createRouteTestApp, type TestApp } from "@be-water/server-test";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";


import { CaptchaService } from "../auth/captcha.service.js";

import { captchaRoutes } from "./captcha.routes.js";

describe("Captcha Routes", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(captchaRoutes, { prefix: "/api/captcha" });
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/captcha/challenge", () => {
    it("should generate captcha challenge", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/captcha/challenge",
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("token");
      expect(data).toHaveProperty("targetX");
      expect(data).toHaveProperty("targetY");
    });

    it("should return a fresh challenge on each request", async () => {
      const first = await app.inject({
        method: "GET",
        url: "/api/captcha/challenge",
      });
      const second = await app.inject({
        method: "GET",
        url: "/api/captcha/challenge",
      });

      const firstData = JSON.parse(first.payload).data;
      const secondData = JSON.parse(second.payload).data;
      expect(firstData.id).not.toBe(secondData.id);
      expect(firstData.token).not.toBe(secondData.token);
    });

    it("should return 500 on unexpected error", async () => {
      vi.spyOn(CaptchaService, "generateChallenge").mockImplementation(() => {
        throw new Error("internal error");
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/captcha/challenge",
      });

      expect(response.statusCode).toBe(500);
      vi.restoreAllMocks();
    });
  });

  describe("POST /api/captcha/verify", () => {
    it.each([
      ["id", { token: "test-token", x: 100, y: 100 }],
      ["token", { id: "test-id", x: 100, y: 100 }],
      ["x", { id: "test-id", token: "test-token", y: 100 }],
      ["y", { id: "test-id", token: "test-token", x: 100 }],
    ])("should return 400 if %s is missing", async (_field, payload) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/captcha/verify",
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for an unknown challenge", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/captcha/verify",
        payload: { id: "invalid-id", token: "invalid-token", x: 100, y: 100 },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for an incorrect slider position", async () => {
      const challengeResponse = await app.inject({
        method: "GET",
        url: "/api/captcha/challenge",
      });
      const { data: challenge } = JSON.parse(challengeResponse.payload);

      const response = await app.inject({
        method: "POST",
        url: "/api/captcha/verify",
        payload: {
          id: challenge.id,
          token: challenge.token,
          x: challenge.targetX + 100,
          y: challenge.targetY + 100,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should verify a correct slider position", async () => {
      const challengeResponse = await app.inject({
        method: "GET",
        url: "/api/captcha/challenge",
      });
      const { data: challenge } = JSON.parse(challengeResponse.payload);

      const response = await app.inject({
        method: "POST",
        url: "/api/captcha/verify",
        payload: {
          id: challenge.id,
          token: challenge.token,
          x: challenge.targetX,
          y: challenge.targetY,
        },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toEqual({ valid: true });
    });

    it("should return 500 on unexpected verify error", async () => {
      vi.spyOn(CaptchaService, "verify").mockImplementation(() => {
        throw new Error("internal error");
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/captcha/verify",
        payload: { id: "test-id", token: "test-token", x: 100, y: 100 },
      });

      expect(response.statusCode).toBe(500);
      vi.restoreAllMocks();
    });
  });
});
