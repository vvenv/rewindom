import { prisma } from "@rewindom/module-sdk/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildDocAlternates,
  duplicateDoc,
  getPublishedDocSitemapEntries,
  listDocs,
  listPublishedDocLocales,
  listPublishedLibraryLocales,
} from "./site-doc.service.js";

vi.mock("@rewindom/module-sdk/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@rewindom/module-sdk/server")>();
  return {
    ...actual,
    prisma: {
      marketingSite: {
        findFirst: vi.fn(),
      },
      siteDoc: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      siteDocCategory: {
        findMany: vi.fn(),
      },
    },
  };
});

const TENANT = "tenant-1";

const siteRow = {
  default_locale: "zh-CN",
};

function sourceDoc(overrides: Record<string, unknown> = {}) {
  const title = (overrides.title as string | undefined) ?? "快速开始";
  return {
    id: "doc-1",
    tenant_id: TENANT,
    slug: "quickstart",
    locale: "zh-CN",
    title,
    description: "摘要",
    body_md: "# 你好",
    category: "入门",
    sort_order: 2,
    status: "published",
    title_draft: (overrides.title_draft as string | undefined) ?? title,
    description_draft: "摘要",
    body_md_draft: "# 你好",
    category_draft: "入门",
    sort_order_draft: 2,
    created_at: new Date("2026-08-01T00:00:00.000Z"),
    updated_at: new Date("2026-08-02T00:00:00.000Z"),
    ...overrides,
  };
}

function createdData(): Record<string, unknown> {
  const call = vi.mocked(prisma.siteDoc.create).mock.calls[0]?.[0] as {
    data: Record<string, unknown>;
  };
  return call.data;
}

describe("buildDocAlternates", () => {
  it("maps each locale to a prefixed path (default locale unprefixed)", () => {
    expect(
      buildDocAlternates("/docs/quickstart", ["zh-CN", "en"], "zh-CN"),
    ).toEqual([
      { locale: "zh-CN", path: "/docs/quickstart" },
      { locale: "en", path: "/en/docs/quickstart" },
    ]);
  });

  it("dedupes locales", () => {
    expect(
      buildDocAlternates("/docs", ["en", "en", "zh-CN"], "zh-CN"),
    ).toEqual([
      { locale: "en", path: "/en/docs" },
      { locale: "zh-CN", path: "/docs" },
    ]);
  });
});

describe("listPublishedDocLocales / listPublishedLibraryLocales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(
      siteRow as never,
    );
  });

  it("orders sibling locales by siteLocaleOrder", async () => {
    vi.mocked(prisma.siteDoc.findMany).mockResolvedValue([
      { locale: "en" },
      { locale: "zh-CN" },
    ] as never);

    const { locales } = await listPublishedDocLocales(TENANT, "quickstart");
    expect(locales).toEqual(["zh-CN", "en"]);
  });

  it("lists distinct library locales", async () => {
    vi.mocked(prisma.siteDoc.findMany).mockResolvedValue([
      { locale: "en" },
      { locale: "en" },
      { locale: "zh-CN" },
    ] as never);

    const { locales } = await listPublishedLibraryLocales(TENANT);
    expect(locales).toEqual(["zh-CN", "en"]);
  });
});

describe("getPublishedDocSitemapEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(
      siteRow as never,
    );
  });

  it("emits index + article urls per locale with full alternate sets", async () => {
    vi.mocked(prisma.siteDoc.findMany).mockResolvedValue([
      {
        slug: "quickstart",
        locale: "zh-CN",
        updated_at: new Date("2026-08-02T00:00:00.000Z"),
      },
      {
        slug: "quickstart",
        locale: "en",
        updated_at: new Date("2026-08-03T00:00:00.000Z"),
      },
    ] as never);

    const entries = await getPublishedDocSitemapEntries(TENANT);
    expect(entries).toEqual([
      {
        path: "/docs",
        updated_at: "2026-08-03T00:00:00.000Z",
        alternates: [
          { locale: "zh-CN", path: "/docs" },
          { locale: "en", path: "/en/docs" },
        ],
      },
      {
        path: "/en/docs",
        updated_at: "2026-08-03T00:00:00.000Z",
        alternates: [
          { locale: "zh-CN", path: "/docs" },
          { locale: "en", path: "/en/docs" },
        ],
      },
      {
        path: "/docs/quickstart",
        updated_at: "2026-08-02T00:00:00.000Z",
        alternates: [
          { locale: "zh-CN", path: "/docs/quickstart" },
          { locale: "en", path: "/en/docs/quickstart" },
        ],
      },
      {
        path: "/en/docs/quickstart",
        updated_at: "2026-08-03T00:00:00.000Z",
        alternates: [
          { locale: "zh-CN", path: "/docs/quickstart" },
          { locale: "en", path: "/en/docs/quickstart" },
        ],
      },
    ]);
  });

  it("returns empty when the library has no published docs", async () => {
    vi.mocked(prisma.siteDoc.findMany).mockResolvedValue([] as never);
    await expect(getPublishedDocSitemapEntries(TENANT)).resolves.toEqual([]);
  });
});

describe("duplicateDoc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(
      siteRow as never,
    );
    vi.mocked(prisma.siteDoc.create).mockImplementation((async ({
      data,
    }: {
      data: Record<string, unknown>;
    }) => ({
      ...sourceDoc(),
      ...data,
      id: "doc-2",
    })) as never);
  });

  it("keeps the slug when copying into another language", async () => {
    vi.mocked(prisma.siteDoc.findFirst)
      .mockResolvedValueOnce(sourceDoc() as never)
      .mockResolvedValueOnce(null as never);

    const doc = await duplicateDoc(TENANT, "doc-1", {
      title: "Getting started",
      locale: "en",
    });

    const data = createdData();
    expect(data.slug).toBe("quickstart");
    expect(data.locale).toBe("en");
    expect(data.title).toBe("Getting started");
    expect(data.title_draft).toBe("Getting started");
    expect(data.body_md_draft).toBe("# 你好");
    expect(data.status).toBe("draft");
    expect(data.sort_order_draft).toBe(2);
    expect(doc.id).toBe("doc-2");
  });

  it("conflicts when the target locale already has that slug", async () => {
    vi.mocked(prisma.siteDoc.findFirst)
      .mockResolvedValueOnce(sourceDoc() as never)
      .mockResolvedValueOnce(sourceDoc({ id: "doc-en", locale: "en" }) as never);

    await expect(
      duplicateDoc(TENANT, "doc-1", { title: "Getting started", locale: "en" }),
    ).rejects.toThrow("site.doc_slug_conflict");
    expect(prisma.siteDoc.create).not.toHaveBeenCalled();
  });

  it("rejects a blank title and an unknown locale", async () => {
    vi.mocked(prisma.siteDoc.findFirst).mockResolvedValue(
      sourceDoc() as never,
    );

    await expect(
      duplicateDoc(TENANT, "doc-1", { title: "   " }),
    ).rejects.toThrow("site.doc_title_required");
    await expect(
      duplicateDoc(TENANT, "doc-1", {
        title: "Getting started",
        locale: "klingon",
      }),
    ).rejects.toThrow("site.locale_invalid");
  });

  it("404s on a doc from another tenant", async () => {
    vi.mocked(prisma.siteDoc.findFirst).mockResolvedValue(null as never);
    await expect(
      duplicateDoc(TENANT, "doc-1", { title: "Getting started", locale: "en" }),
    ).rejects.toThrow("site.doc_not_found");
  });
});

describe("listDocs", () => {
  beforeEach(() => {
    vi.mocked(prisma.siteDoc.findMany).mockReset();
    vi.mocked(prisma.siteDoc.count).mockReset();
    vi.mocked(prisma.siteDocCategory.findMany).mockResolvedValue([]);
  });

  it("returns paginated items with facets from the full library", async () => {
    const published = sourceDoc();
    const draft = sourceDoc({
      id: "doc-2",
      slug: "faq",
      title: "FAQ",
      title_draft: "FAQ",
      status: "draft",
      category: "",
      category_draft: "",
      locale: "en",
    });

    vi.mocked(prisma.siteDoc.findMany)
      .mockResolvedValueOnce([
        { category_draft: "入门", locale: "zh-CN" },
        { category_draft: "", locale: "en" },
      ] as never)
      .mockResolvedValueOnce([published] as never);
    vi.mocked(prisma.siteDoc.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const result = await listDocs(TENANT, {
      status: "published",
      page: 1,
      page_size: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.slug).toBe("quickstart");
    expect(result.total).toBe(1);
    expect(result.total_all).toBe(2);
    expect(result.categories).toEqual(["入门"]);
    expect(result.category_catalog).toEqual([]);
    expect(result.locales).toEqual(["zh-CN", "en"]);
    expect(draft.slug).toBe("faq");
  });

  it("filters dirty docs in memory after narrowing to published", async () => {
    const clean = sourceDoc({ id: "clean" });
    const dirty = sourceDoc({
      id: "dirty",
      title_draft: "快速开始（改）",
    });

    vi.mocked(prisma.siteDoc.findMany)
      .mockResolvedValueOnce([
        { category_draft: "入门", locale: "zh-CN" },
      ] as never)
      .mockResolvedValueOnce([clean, dirty] as never);
    vi.mocked(prisma.siteDoc.count).mockResolvedValueOnce(2);

    const result = await listDocs(TENANT, { status: "dirty" });

    expect(result.items.map((item) => item.id)).toEqual(["dirty"]);
    expect(result.total).toBe(1);
    expect(result.total_all).toBe(2);
  });
});
