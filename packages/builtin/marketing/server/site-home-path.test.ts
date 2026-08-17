import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveVisitorHomePath } from "./site.service.js";

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    marketingSite: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../platform/server/services/tenant-module.service.js", () => ({
  isTenantModuleEnabled: vi.fn().mockResolvedValue(false),
}));

const TENANT = "tenant-1";

describe("resolveVisitorHomePath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("leaves non-root paths alone", async () => {
    await expect(
      resolveVisitorHomePath({
        tenantId: TENANT,
        path: "/events",
        entitlements: new Set(),
      }),
    ).resolves.toEqual({ logicalPath: "/events", servedPath: "/events" });
    expect(prisma.marketingSite.findFirst).not.toHaveBeenCalled();
  });

  it("rewrites / to the configured home path", async () => {
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue({
      home_path: "/events",
    } as never);

    await expect(
      resolveVisitorHomePath({
        tenantId: TENANT,
        path: "/",
        entitlements: new Set(),
      }),
    ).resolves.toEqual({ logicalPath: "/events", servedPath: "/" });
  });

  it("falls back to / when the site is unpublished", async () => {
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(null);

    await expect(
      resolveVisitorHomePath({
        tenantId: TENANT,
        path: "/",
        entitlements: new Set(),
      }),
    ).resolves.toEqual({ logicalPath: "/", servedPath: "/" });
  });
});
