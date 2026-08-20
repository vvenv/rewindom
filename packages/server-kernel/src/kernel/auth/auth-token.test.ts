// eslint-disable-next-line import/order
import { mockTenant } from "./auth.service.test-mocks.js";
import { DEFAULT_TENANT_ID } from "@rewindom/shared";
import { describe, it, expect, vi } from "vitest";

import { prisma } from "../../lib/prisma.js";

import { AuthService } from "./auth.service.js";

const TENANT_ID = DEFAULT_TENANT_ID;

describe("AuthService tokens", () => {
  describe("generateTokens", () => {
    it("should generate access and refresh tokens", () => {
      const jwtSign = vi.fn(
        (payload) => `token_${payload.type}_${payload.userId}`,
      );

      const result = AuthService.generateTokens(
        "user-123",
        "tenant_user",
        false,
        TENANT_ID,
        "default",
        jwtSign,
      );

      expect(jwtSign).toHaveBeenCalledWith({
        userId: "user-123",
        actor_type: "tenant_user",
        is_system_admin: false,
        tenant_id: TENANT_ID,
        tenant_slug: "rewindom",
        type: "access",
      });
      expect(jwtSign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          actor_type: "tenant_user",
          is_system_admin: false,
          tenant_id: TENANT_ID,
          tenant_slug: "rewindom",
          type: "refresh",
          jti: expect.any(String),
        }),
      );
      expect(result).toEqual({
        accessToken: "token_access_user-123",
        refreshToken: "token_refresh_user-123",
      });
    });
  });

  describe("refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        is_system_admin: false,
        enabled: true,
        tenant_id: TENANT_ID,
        tenant: mockTenant,
      };
      const mockStoredToken = {
        id: "token-123",
        token: "valid_refresh_token",
        user_id: "user-123",
        revoked: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: mockUser,
      };

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(
        mockStoredToken as never,
      );
      vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as never);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);

      const jwtSign = vi.fn(
        (payload) => `token_${payload.type}_${payload.userId}`,
      );
      const jwtVerify = vi.fn(() => ({
        userId: "user-123",
        actor_type: "tenant_user",
        is_system_admin: false,
        type: "refresh",
        tenant_id: TENANT_ID,
        tenant_slug: "rewindom",
      }));

      const result = await AuthService.refresh(
        "valid_refresh_token",
        jwtSign,
        jwtVerify,
      );

      expect(result).toBeDefined();
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: "token-123" },
        data: { revoked: true },
      });
    });

    it("should throw error for invalid refresh token", async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null);
      const jwtVerify = vi.fn(() => {
        throw new Error("invalid refresh token");
      });

      await expect(
        AuthService.refresh("invalid_token", vi.fn(), jwtVerify),
      ).rejects.toMatchObject({ code: "auth.refresh_invalid" });
    });

    it("should throw error for revoked refresh token", async () => {
      const mockStoredToken = {
        id: "token-123",
        token: "revoked_token",
        user_id: "user-123",
        revoked: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: { id: "user-123", enabled: true },
      };

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(
        mockStoredToken as never,
      );
      const jwtVerify = vi.fn(() => ({
        userId: "user-123",
        actor_type: "tenant_user",
        is_system_admin: false,
        type: "refresh",
        tenant_id: TENANT_ID,
        tenant_slug: "rewindom",
      }));

      await expect(
        AuthService.refresh("revoked_token", vi.fn(), jwtVerify),
      ).rejects.toMatchObject({ code: "auth.refresh_invalid" });
    });

    it("should throw error for expired refresh token", async () => {
      const mockStoredToken = {
        id: "token-123",
        token: "expired_token",
        user_id: "user-123",
        revoked: false,
        expires_at: new Date(Date.now() - 1000),
        user: { id: "user-123", enabled: true },
      };

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(
        mockStoredToken as never,
      );
      vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as never);
      const jwtVerify = vi.fn(() => ({
        userId: "user-123",
        actor_type: "tenant_user",
        is_system_admin: false,
        type: "refresh",
        tenant_id: TENANT_ID,
        tenant_slug: "rewindom",
      }));

      await expect(
        AuthService.refresh("expired_token", vi.fn(), jwtVerify),
      ).rejects.toMatchObject({ code: "auth.refresh_expired" });
    });

    it("should throw error for disabled user", async () => {
      const mockStoredToken = {
        id: "token-123",
        token: "valid_token",
        user_id: "user-123",
        revoked: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: { id: "user-123", enabled: false },
      };

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(
        mockStoredToken as never,
      );
      const jwtVerify = vi.fn(() => ({
        userId: "user-123",
        actor_type: "tenant_user",
        is_system_admin: false,
        type: "refresh",
        tenant_id: TENANT_ID,
        tenant_slug: "rewindom",
      }));

      await expect(
        AuthService.refresh("valid_token", vi.fn(), jwtVerify),
      ).rejects.toMatchObject({ code: "auth.account_disabled" });
    });
  });

  describe("revokeAllUserTokens", () => {
    it("should revoke all refresh tokens for a user", async () => {
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({
        count: 5,
      } as never);

      await AuthService.revokeAllUserTokens("user-123");

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: "user-123" },
        data: { revoked: true },
      });
    });
  });
});
