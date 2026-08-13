import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from "@rewindom/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
}));

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    tenant: {
      upsert: upsertMock,
    },
  },
}));

import { ensureDefaultTenant } from "./ensure-default-tenant.service.js";

describe("ensureDefaultTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({});
  });

  it("upserts default tenant for platform bootstrap", async () => {
    await ensureDefaultTenant();

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: DEFAULT_TENANT_ID },
      create: {
        id: DEFAULT_TENANT_ID,
        slug: DEFAULT_TENANT_SLUG,
        name: "默认租户",
        status: "active",
        plan: "free",
      },
      update: {
        slug: DEFAULT_TENANT_SLUG,
        status: "active",
      },
    });
  });
});
