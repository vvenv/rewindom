import { DEFAULT_TENANT_ID, PLATFORM_ADMIN_USER_ID } from "@be-water/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
}));

vi.mock("@be-water/server-kernel/lib/prisma.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    prisma: {
      ...(actual.prisma as Record<string, unknown>),
      tenant: {
        ...((actual.prisma as Record<string, unknown>).tenant as Record<
          string,
          unknown
        >),
        upsert: vi.fn().mockResolvedValue({}),
      },
      user: {
        ...((actual.prisma as Record<string, unknown>).user as Record<
          string,
          unknown
        >),
        upsert: upsertMock,
      },
    },
  };
});

import {
  ensurePlatformSystemUser,
  PLATFORM_SYSTEM_USERNAME,
} from "./ensure-platform-system-user.service.js";

describe("ensurePlatformSystemUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({});
  });

  it("upserts disabled system user for platform admin job FK", async () => {
    await ensurePlatformSystemUser();

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: PLATFORM_ADMIN_USER_ID },
      create: {
        id: PLATFORM_ADMIN_USER_ID,
        tenant_id: DEFAULT_TENANT_ID,
        username: PLATFORM_SYSTEM_USERNAME,
        password: "!",
        is_system_admin: true,
        enabled: false,
      },
      update: {},
    });
  });
});
