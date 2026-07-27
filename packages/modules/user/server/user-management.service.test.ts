import "@be-water/server-kernel/kernel/auth/auth.service.test-mocks.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import {
  DEFAULT_TENANT_ID,
  PLATFORM_ADMIN_USER_ID,
  TENANT_IMPERSONATION_USERNAME,
} from "@be-water/shared";
import bcrypt from "bcrypt";
import { describe, it, expect, vi } from "vitest";

import { UserManagementService } from "./user-management.service.js";

const TENANT_ID = DEFAULT_TENANT_ID;

const excludeInternalWhere = {
  id: { not: PLATFORM_ADMIN_USER_ID },
  username: { not: TENANT_IMPERSONATION_USERNAME },
};

const userSelect = {
  id: true,
  username: true,
  is_system_admin: true,
  enabled: true,
  created_at: true,
  updated_at: true,
  last_login_at: true,
  last_access_at: true,
  failed_login_attempts: true,
  locked_until: true,
  user_roles: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
          is_builtin: true,
        },
      },
    },
  },
};

describe("UserManagementService", () => {
  describe("getAllUsers", () => {
    it("should get all users with default parameters", async () => {
      const mockUsers = [
        {
          id: "user-123",
          username: "testuser",
          is_system_admin: false,
          enabled: true,
          created_at: new Date(),
          updated_at: new Date(),
          last_login_at: new Date(),
          last_access_at: new Date(),
          failed_login_attempts: 0,
          locked_until: null,
          user_roles: [],
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);

      const result = await UserManagementService.getAllUsers(TENANT_ID);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          tenant_id: TENANT_ID,
          ...excludeInternalWhere,
        },
        select: userSelect,
        orderBy: [{ created_at: "desc" }],
      });
      expect(result[0]?.username).toBe("testuser");
      expect(result[0]?.roles).toEqual([]);
    });

    it("should get all users with pagination", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

      await UserManagementService.getAllUsers(TENANT_ID, 10, 20);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          tenant_id: TENANT_ID,
          ...excludeInternalWhere,
        },
        select: userSelect,
        orderBy: [{ created_at: "desc" }],
        skip: 10,
        take: 20,
      });
    });

    it("should get all users with search", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

      await UserManagementService.getAllUsers(TENANT_ID, 10, 20, "test");

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          tenant_id: TENANT_ID,
          ...excludeInternalWhere,
          OR: [{ username: { contains: "test", mode: "insensitive" } }],
        },
        select: userSelect,
        orderBy: [{ created_at: "desc" }],
        skip: 10,
        take: 20,
      });
    });
  });

  describe("getUserDisplayCatalog", () => {
    it("excludes platform system user from assignee catalog", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      await UserManagementService.getUserDisplayCatalog(TENANT_ID);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          tenant_id: TENANT_ID,
          ...excludeInternalWhere,
        },
        select: { id: true, username: true },
        orderBy: { username: "asc" },
      });
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          tenant_id: TENANT_ID,
          ...excludeInternalWhere,
        },
      });
    });
  });

  describe("getUsersCount", () => {
    it("should get total user count", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(100);

      const result = await UserManagementService.getUsersCount(TENANT_ID);

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          tenant_id: TENANT_ID,
          ...excludeInternalWhere,
        },
      });
      expect(result).toBe(100);
    });

    it("should get user count with search", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(50);

      const result = await UserManagementService.getUsersCount(
        TENANT_ID,
        "test",
      );

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          tenant_id: TENANT_ID,
          ...excludeInternalWhere,
          OR: [{ username: { contains: "test", mode: "insensitive" } }],
        },
      });
      expect(result).toBe(50);
    });
  });

  describe("createUser", () => {
    it("should create a new user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed_password" as never);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
        (callback as (tx: typeof prisma) => unknown)({
          user: {
            create: vi.fn().mockResolvedValue({
              id: "user-123",
              username: "testuser",
              is_system_admin: true,
              enabled: true,
              created_at: new Date(),
              updated_at: new Date(),
            }),
          },
          role: { findMany: vi.fn() },
          userRole: { createMany: vi.fn() },
        } as never),
      );

      const result = await UserManagementService.createUser({
        tenant_id: TENANT_ID,
        username: "testuser",
        password: "password123",
        is_system_admin: true,
      });

      expect(result.username).toBe("testuser");
      expect(result.is_system_admin).toBe(true);
    });

    it("should throw error if username is reserved", async () => {
      await expect(
        UserManagementService.createUser({
          tenant_id: TENANT_ID,
          username: "__support_impersonation__",
          password: "password123",
        }),
      ).rejects.toThrow("该用户名为系统保留，不可使用");
    });

    it("should throw error if username already exists", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "existing-user",
        username: "testuser",
      } as never);

      await expect(
        UserManagementService.createUser({
          tenant_id: TENANT_ID,
          username: "testuser",
          password: "password123",
        }),
      ).rejects.toThrow("用户名已存在");
    });
  });

  describe("updateUser", () => {
    it("should update a user", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        is_system_admin: false,
        enabled: true,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
        (callback as (tx: typeof prisma) => unknown)({
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              is_system_admin: true,
              last_login_at: new Date(),
            }),
          },
          role: { findMany: vi.fn() },
          userRole: { deleteMany: vi.fn(), createMany: vi.fn() },
        } as never),
      );

      const result = await UserManagementService.updateUser({
        tenant_id: TENANT_ID,
        id: "user-123",
        is_system_admin: true,
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { tenant_id: TENANT_ID, id: "user-123" },
      });
      expect(result.is_system_admin).toBe(true);
    });

    it("should throw error if user not found", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(
        UserManagementService.updateUser({
          tenant_id: TENANT_ID,
          id: "user-123",
          is_system_admin: true,
        }),
      ).rejects.toThrow("用户不存在");
    });
  });

  describe("deleteUser", () => {
    it("should delete a user", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.delete).mockResolvedValue({} as never);

      await UserManagementService.deleteUser(TENANT_ID, "user-123");

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: "user-123", tenant_id: TENANT_ID },
      });
    });

    it("should throw error if user not found", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(
        UserManagementService.deleteUser(TENANT_ID, "user-123"),
      ).rejects.toThrow("用户不存在");
    });
  });

  describe("resetPassword", () => {
    it("should reset user password", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
      vi.mocked(bcrypt.hash).mockResolvedValue("new_hashed_password" as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({
        count: 5,
      } as never);

      const result = await UserManagementService.resetPassword({
        tenant_id: DEFAULT_TENANT_ID,
        userId: "user-123",
        newPassword: "new_password",
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { tenant_id: DEFAULT_TENANT_ID, id: "user-123" },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123", tenant_id: DEFAULT_TENANT_ID },
        data: {
          password: "new_hashed_password",
          failed_login_attempts: 0,
          locked_until: null,
        },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: "user-123" },
        data: { revoked: true },
      });
      expect(result.password).toBe("new_password");
    });

    it("should throw error if user not found", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(
        UserManagementService.resetPassword({
          tenant_id: DEFAULT_TENANT_ID,
          userId: "user-123",
          newPassword: "new_password",
        }),
      ).rejects.toThrow("用户不存在");
    });
  });
});
