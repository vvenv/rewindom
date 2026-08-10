import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { migrateLegacyDocCategories, reorderDocCategories } from "./marketing-doc-category.service.js";

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

describe("migrateLegacyDocCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps legacy free-text values to canonical keys and creates categories", async () => {
    const tx = {
      marketingDocCategory: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
      },
      marketingDoc: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "doc-1",
            category: "入门",
            category_draft: "入门",
          },
        ]),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
      fn(tx as never),
    );

    const result = await migrateLegacyDocCategories(TENANT);

    expect(result.categories).toBe(1);
    expect(result.docs).toBe(1);
    expect(tx.marketingDocCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenant_id: TENANT,
          label: "入门",
        }),
      }),
    );
    expect(tx.marketingDoc.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "doc-1", tenant_id: TENANT },
        data: expect.objectContaining({
          category: expect.stringMatching(/^cat-[a-z0-9]+$/u),
          category_draft: expect.stringMatching(/^cat-[a-z0-9]+$/u),
        }),
      }),
    );
  });

  it("is idempotent when docs already use an existing category key", async () => {
    const tx = {
      marketingDocCategory: {
        findMany: vi.fn().mockResolvedValue([{ key: "guides", sort_order: 0 }]),
        create: vi.fn(),
      },
      marketingDoc: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "doc-1",
            category: "guides",
            category_draft: "guides",
          },
        ]),
        update: vi.fn(),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
      fn(tx as never),
    );

    const result = await migrateLegacyDocCategories(TENANT);

    expect(result).toEqual({ categories: 0, docs: 0 });
    expect(tx.marketingDocCategory.create).not.toHaveBeenCalled();
    expect(tx.marketingDoc.update).not.toHaveBeenCalled();
  });
});

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
