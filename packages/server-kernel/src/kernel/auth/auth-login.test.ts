import "./auth.service.test-mocks.js";
import bcrypt from "bcrypt";
import { describe, it, expect, vi } from "vitest";

import { prisma } from "../../lib/prisma.js";

import { AuthService } from "./auth.service.js";

describe("AuthService login", () => {
  describe("login", () => {
    it("should login user with valid credentials", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        password: "hashed_password",
        is_system_admin: false,
        enabled: true,
        locked_until: null,
        failed_login_attempts: 0,
        last_login_at: null,
        last_access_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({
          ...mockUser,
          tenant_id: undefined,
        } as never)
        .mockResolvedValueOnce(mockUser as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);

      const jwtSign = vi.fn(
        (payload) => `token_${payload.type}_${payload.userId}`,
      );

      const result = await AuthService.login(
        {
          username: "testuser@default",
          password: "password123",
        },
        jwtSign,
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: expect.any(Date),
          last_access_at: expect.any(Date),
        },
      });
      expect(result.tokens).toBeDefined();
      expect(result.user.username).toBe("testuser");
      expect(result.user.actor_type).toBe("tenant_user");
    });

    it("should login platform admin when credentials match", async () => {
      const now = new Date();
      vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue({
        id: "admin-id",
        username: "platform",
        password: "hashed_password",
        is_system_admin: true,
        enabled: true,
        failed_login_attempts: 0,
        locked_until: null,
      } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(prisma.platformAdmin.update).mockResolvedValue({
        id: "admin-id",
        username: "platform",
        is_system_admin: true,
        enabled: true,
        created_at: now,
        updated_at: now,
        last_login_at: now,
        last_access_at: now,
      } as never);
      vi.mocked(prisma.platformAdminRefreshToken.create).mockResolvedValue(
        {} as never,
      );

      const jwtSign = vi.fn(
        (payload) => `token_${payload.type}_${payload.userId}`,
      );

      const result = await AuthService.login(
        { username: "platform", password: "platform-secret" },
        jwtSign,
      );

      expect(result.user.actor_type).toBe("platform_admin");
      expect(result.user.is_system_admin).toBe(true);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it("should throw error for invalid credentials", async () => {
      vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        AuthService.login(
          {
            username: "testuser@default",
            password: "wrong_password",
          },
          vi.fn(),
        ),
      ).rejects.toMatchObject({ code: "auth.invalid_credentials" });
    });

    it("should throw error for disabled user", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        password: "hashed_password",
        is_system_admin: false,
        enabled: false,
        locked_until: null,
        failed_login_attempts: 0,
        last_access_at: null,
      };

      vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);

      await expect(
        AuthService.login(
          {
            username: "testuser@default",
            password: "password123",
          },
          vi.fn(),
        ),
      ).rejects.toMatchObject({ code: "auth.account_disabled" });
    });

    it("should throw error for locked account", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        password: "hashed_password",
        is_system_admin: false,
        enabled: true,
        locked_until: new Date(Date.now() + 30 * 60 * 1000),
        failed_login_attempts: 5,
      };

      vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as never)
        .mockResolvedValueOnce(mockUser as never);

      await expect(
        AuthService.login(
          {
            username: "testuser@default",
            password: "password123",
          },
          vi.fn(),
        ),
      ).rejects.toMatchObject({ code: "auth.account_locked_retry" });
    });

    it("should increment failed login attempts on wrong password", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        password: "hashed_password",
        is_system_admin: false,
        enabled: true,
        locked_until: null,
        failed_login_attempts: 3,
      };

      vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as never)
        .mockResolvedValueOnce(mockUser as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);

      await expect(
        AuthService.login(
          {
            username: "testuser@default",
            password: "wrong_password",
          },
          vi.fn(),
        ),
      ).rejects.toMatchObject({ code: "auth.invalid_credentials" });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          failed_login_attempts: 4,
        },
      });
    });

    it("should lock account after 5 failed attempts", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        password: "hashed_password",
        is_system_admin: false,
        enabled: true,
        locked_until: null,
        failed_login_attempts: 4,
      };

      vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as never)
        .mockResolvedValueOnce(mockUser as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);

      await expect(
        AuthService.login(
          {
            username: "testuser@default",
            password: "wrong_password",
          },
          vi.fn(),
        ),
      ).rejects.toMatchObject({ code: "auth.invalid_credentials" });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          failed_login_attempts: 5,
          locked_until: expect.any(Date),
        },
      });
    });
  });
});
