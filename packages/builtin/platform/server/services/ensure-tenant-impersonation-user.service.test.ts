import {
  DEFAULT_TENANT_ID,
  PLATFORM_ADMIN_USER_ID,
  TENANT_IMPERSONATION_USERNAME,
} from "@be-water/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
}));

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    user: {
      upsert: upsertMock,
    },
  },
}));

import {
  buildTenantImpersonationUserCreateData,
  ensureTenantImpersonationUser,
  excludeInternalUsersWhere,
} from "./ensure-tenant-impersonation-user.service.js";

describe("ensureTenantImpersonationUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({
      id: "shadow-user",
      username: TENANT_IMPERSONATION_USERNAME,
      is_system_admin: true,
      enabled: false,
    });
  });

  it("upserts disabled shadow user for tenant impersonation", async () => {
    await ensureTenantImpersonationUser(DEFAULT_TENANT_ID);

    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        tenant_id_username: {
          tenant_id: DEFAULT_TENANT_ID,
          username: TENANT_IMPERSONATION_USERNAME,
        },
      },
      create: buildTenantImpersonationUserCreateData(DEFAULT_TENANT_ID),
      update: {
        is_system_admin: true,
        enabled: false,
      },
    });
  });

  it("excludes platform system user and shadow users from user lists", () => {
    expect(excludeInternalUsersWhere).toEqual({
      id: { not: PLATFORM_ADMIN_USER_ID },
      username: { not: TENANT_IMPERSONATION_USERNAME },
    });
  });
});
