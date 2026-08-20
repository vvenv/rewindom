import { DEFAULT_TENANT_ID } from "@rewindom/shared";
import { beforeEach, vi } from "vitest";

import { prisma } from "../../lib/prisma.js";

vi.mock("../../lib/config.js", () => ({
  config: {
    auth: {
      platformAdmin: {
        username: "platform",
        password: "platform-secret",
        passwordHash: "",
      },
    },
  },
}));

// Mock prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
    platformAdmin: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    platformAdminRefreshToken: {
      create: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

export const mockTenant = {
  id: DEFAULT_TENANT_ID,
  slug: "rewindom",
  name: "默认租户",
  status: "active",
  created_at: new Date(),
  updated_at: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as never);
});
