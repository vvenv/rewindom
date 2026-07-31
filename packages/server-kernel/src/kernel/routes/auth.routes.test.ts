import {
  createRouteTestApp,
  createTestUserFast,
  type TestApp,
  type TestUser,
} from "@be-water/server-test";
import { DEFAULT_TENANT_SLUG, TENANT_IMPERSONATION_USERNAME  } from "@be-water/shared";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";

import { AuthService } from "../auth/auth.service.js";
import {
  NotFoundError,
  UnauthorizedError,
} from "../../lib/app-errors.js";

import { authRoutes } from "./auth.routes.js";

describe("Auth Routes", () => {
  let app: TestApp;
  let testUser: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(authRoutes, { prefix: "/api/auth" });
    });
    testUser = await createTestUserFast(app, "testuser", "password123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      vi.spyOn(AuthService, "login").mockResolvedValue({
        user: {
          id: testUser.id,
          username: testUser.username,
          actor_type: "tenant_user",
          is_system_admin: false,
          enabled: true,
          created_at: new Date(),
          updated_at: new Date(),
          last_login_at: null,
          last_access_at: null,
        },
        tokens: { accessToken: "access", refreshToken: "refresh" },
        tenant_slug: DEFAULT_TENANT_SLUG,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: testUser.username, password: "password123" },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.tokens).toHaveProperty("accessToken");
      expect(data.tokens).toHaveProperty("refreshToken");
      expect(data.user).toHaveProperty("id", testUser.id);
      expect(data.user).toHaveProperty("username", testUser.username);
    });

    it("should return 400 if username or password is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: testUser.username },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 401 with invalid credentials", async () => {
      vi.spyOn(AuthService, "login").mockRejectedValue(
        new UnauthorizedError("auth.invalid_credentials"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: testUser.username, password: "wrongpassword" },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "auth.invalid_credentials" });
    });

    it("should return 401 when account is disabled", async () => {
      vi.spyOn(AuthService, "login").mockRejectedValue(
        new UnauthorizedError("auth.account_disabled"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: testUser.username, password: "password123" },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "auth.account_disabled" });
    });

    it("should return 401 when account is locked", async () => {
      vi.spyOn(AuthService, "login").mockRejectedValue(
        new UnauthorizedError("auth.account_locked_retry"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: testUser.username, password: "password123" },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        code: "auth.account_locked_retry",
      });
    });

    it("should return 500 on unexpected login error", async () => {
      vi.spyOn(AuthService, "login").mockRejectedValue(
        new Error("unexpected db error"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: testUser.username, password: "password123" },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh tokens successfully", async () => {
      vi.spyOn(AuthService, "refresh").mockResolvedValue({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken: testUser.refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
    });

    it("should return 400 if refresh token is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 401 with invalid refresh token", async () => {
      vi.spyOn(AuthService, "refresh").mockRejectedValue(
        new UnauthorizedError("auth.refresh_invalid"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken: "invalid-token" },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "auth.refresh_invalid" });
    });

    it("should return 401 with expired refresh token", async () => {
      vi.spyOn(AuthService, "refresh").mockRejectedValue(
        new UnauthorizedError("auth.refresh_expired"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken: "expired-token" },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "auth.refresh_expired" });
    });

    it("should return 401 when account is disabled during refresh", async () => {
      vi.spyOn(AuthService, "refresh").mockRejectedValue(
        new UnauthorizedError("auth.account_disabled"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken: "some-token" },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "auth.account_disabled" });
    });

    it("should return 500 on unexpected refresh error", async () => {
      vi.spyOn(AuthService, "refresh").mockRejectedValue(
        new Error("db connection error"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken: "some-token" },
      });
      expect(response.statusCode).toBe(500);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      vi.spyOn(AuthService, "logout").mockResolvedValue(undefined);

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/logout",
        headers: authHeaders(testUser),
        payload: { refreshToken: testUser.refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toBeNull();
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/logout",
        payload: { refreshToken: testUser.refreshToken },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 400 if refresh token is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/logout",
        headers: authHeaders(testUser),
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 500 on unexpected logout error", async () => {
      vi.spyOn(AuthService, "logout").mockRejectedValue(new Error("db error"));

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/logout",
        headers: authHeaders(testUser),
        payload: { refreshToken: testUser.refreshToken },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe("POST /api/auth/change-password", () => {
    it("should change password successfully", async () => {
      vi.spyOn(AuthService, "changePassword").mockResolvedValue(undefined);

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/change-password",
        headers: authHeaders(testUser),
        payload: { oldPassword: "password123", newPassword: "newpassword123" },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toBeNull();
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/change-password",
        payload: { oldPassword: "password123", newPassword: "newpassword123" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 400 if old password or new password is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/change-password",
        headers: authHeaders(testUser),
        payload: { oldPassword: "password123" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 if new password is too short", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/change-password",
        headers: authHeaders(testUser),
        payload: { oldPassword: "password123", newPassword: "12345" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 401 with invalid old password", async () => {
      vi.spyOn(AuthService, "changePassword").mockRejectedValue(
        new UnauthorizedError("auth.old_password_wrong"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/change-password",
        headers: authHeaders(testUser),
        payload: {
          oldPassword: "wrongpassword",
          newPassword: "newpassword123",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        code: "auth.old_password_wrong",
      });
    });

    it("should return 403 for impersonation shadow user", async () => {
      const shadowUser = await createTestUserFast(
        app,
        TENANT_IMPERSONATION_USERNAME,
        "password123",
        { is_system_admin: true },
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/change-password",
        headers: authHeaders(shadowUser),
        payload: { oldPassword: "password123", newPassword: "newpassword123" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        code: "auth.password_change_unsupported",
      });
    });

    it("should return 500 on unexpected change-password error", async () => {
      vi.spyOn(AuthService, "changePassword").mockRejectedValue(
        new Error("db error"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/change-password",
        headers: authHeaders(testUser),
        payload: { oldPassword: "password123", newPassword: "newpassword123" },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should get current user successfully", async () => {
      vi.spyOn(AuthService, "getUserById").mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        actor_type: "tenant_user",
        is_system_admin: false,
        enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: null,
        last_access_at: null,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: authHeaders(testUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("id", testUser.id);
      expect(data).toHaveProperty("username", testUser.username);
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({ method: "GET", url: "/api/auth/me" });
      expect(response.statusCode).toBe(401);
    });

    it("should return 401 with invalid token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: { authorization: "Bearer invalid-token" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 404 when user not found", async () => {
      vi.spyOn(AuthService, "getUserById").mockRejectedValue(
        new NotFoundError("user.not_found"),
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: authHeaders(testUser),
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ code: "user.not_found" });
    });

    it("should return 500 on unexpected error", async () => {
      vi.spyOn(AuthService, "getUserById").mockRejectedValue(
        new Error("db error"),
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: authHeaders(testUser),
      });

      expect(response.statusCode).toBe(500);
    });
  });
});
