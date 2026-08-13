import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { reorderDocCategories } from "./marketing-doc-category.service.js";

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    marketingDocCategory: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    marketingDoc: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    marketingSite: {
      findFirst: vi.fn(),
    },
  },
}));

const TENANT = "tenant-1";

describe("reorderDocCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates sort_order in one transaction and returns the sorted list", async () => {
    vi.mocked(prisma.marketingDocCategory.count).mockResolvedValue(2);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);
    vi.mocked(prisma.marketingDocCategory.findMany).mockResolvedValue([
      {
        id: "b",
        tenant_id: TENANT,
        key: "beta",
        label: "Beta",
        sort_order: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "a",
        tenant_id: TENANT,
        key: "alpha",
        label: "Alpha",
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ] as never);

    const result = await reorderDocCategories(TENANT, {
      items: [
        { id: "a", sort_order: 1 },
        { id: "b", sort_order: 0 },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.map((item) => item.key)).toEqual(["beta", "alpha"]);
  });
});
