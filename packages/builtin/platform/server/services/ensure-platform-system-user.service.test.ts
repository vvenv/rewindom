import { DEFAULT_TENANT_ID, PLATFORM_ADMIN_USER_ID } from "@be-water/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock, upsertMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    tenant: {
      findUnique: findUniqueMock,
    },
    user: {
      upsert: upsertMock,
    },
  },
}));

import {
  ensurePlatformSystemUser,
  PLATFORM_SYSTEM_USERNAME,
} from "./ensure-platform-system-user.service.js";

describe("ensurePlatformSystemUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueMock.mockResolvedValue({ id: DEFAULT_TENANT_ID });
    upsertMock.mockResolvedValue({});
  });

  it("upserts disabled system user when default tenant exists", async () => {
    await ensurePlatformSystemUser();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: DEFAULT_TENANT_ID },
      select: { id: true },
    });
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

  it("skips when default tenant has not been created yet", async () => {
    findUniqueMock.mockResolvedValue(null);

    await ensurePlatformSystemUser();

    expect(upsertMock).not.toHaveBeenCalled();
  });
});
