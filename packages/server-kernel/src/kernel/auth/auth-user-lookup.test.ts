import "./auth.service.test-mocks.js";
import { describe, it, expect, vi } from "vitest";

import { prisma } from "../../lib/prisma.js";

import { AuthService } from "./auth.service.js";

describe("AuthService user lookup", () => {
  describe("getUserById", () => {
    it("should get tenant user by ID", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        is_system_admin: false,
        enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: new Date(),
        last_access_at: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);

      const result = await AuthService.getUserById("user-123", "tenant_user");

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        select: {
          id: true,
          username: true,
          is_system_admin: true,
          enabled: true,
          created_at: true,
          updated_at: true,
          last_login_at: true,
          last_access_at: true,
        },
      });
      expect(result).toEqual({
        ...mockUser,
        actor_type: "tenant_user",
      });
    });

    it("should throw error if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        AuthService.getUserById("user-123", "tenant_user"),
      ).rejects.toThrow("用户不存在");
    });
  });
});
