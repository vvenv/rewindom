import "./auth.service.test-mocks.js";
import bcrypt from "bcrypt";
import { describe, it, expect, vi } from "vitest";

import { prisma } from "../../lib/prisma.js";

import { AuthService, BCRYPT_SALT_ROUNDS } from "./auth.service.js";

describe("AuthService password", () => {
  describe("hashPassword", () => {
    it("should hash a password", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed_password" as never);

      const result = await AuthService.hashPassword("password123");

      expect(bcrypt.hash).toHaveBeenCalledWith(
        "password123",
        BCRYPT_SALT_ROUNDS,
      );
      expect(result).toBe("hashed_password");
    });
  });

  describe("verifyPassword", () => {
    it("should verify a password against a hash", async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await AuthService.verifyPassword(
        "password123",
        "hashed_password",
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashed_password",
      );
      expect(result).toBe(true);
    });

    it("should return false for invalid password", async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const result = await AuthService.verifyPassword(
        "wrong_password",
        "hashed_password",
      );

      expect(result).toBe(false);
    });
  });

  describe("changePassword", () => {
    it("should change user password", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        password: "old_hashed_password",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue("new_hashed_password" as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await AuthService.changePassword({
        userId: "user-123",
        oldPassword: "old_password",
        newPassword: "new_password",
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        "old_password",
        "old_hashed_password",
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(
        "new_password",
        BCRYPT_SALT_ROUNDS,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { password: "new_hashed_password" },
      });
    });

    it("should throw error for invalid old password", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        password: "old_hashed_password",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        AuthService.changePassword({
          userId: "user-123",
          oldPassword: "wrong_password",
          newPassword: "new_password",
        }),
      ).rejects.toMatchObject({ code: "auth.old_password_wrong" });
    });

    it("should throw error if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        AuthService.changePassword({
          userId: "user-123",
          oldPassword: "old_password",
          newPassword: "new_password",
        }),
      ).rejects.toMatchObject({ code: "user.not_found" });
    });
  });

});
