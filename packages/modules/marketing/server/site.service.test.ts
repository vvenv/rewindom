import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { duplicatePage, saveEditorDraft, applySiteStarter } from "./site.service.js";

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    marketingSite: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    marketingPage: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// 品牌资产只在公开读路径用得上，复制页面不该碰它
vi.mock("../../platform/server/services/tenant-branding.service.js", () => ({
  getTenantBrandingUrls: vi.fn(async () => ({ logo_url: null })),
}));

const TENANT = "tenant-1";

const siteRow = {
  id: "site-1",
  tenant_id: TENANT,
  site_name: "Acme",
  tagline: "",
  theme_settings: {},
  default_locale: "zh-CN",
  nav_json: [],
  footer_json: [],
  nav_draft_json: [],
  footer_draft_json: [],
  published: true,
  created_at: new Date("2026-08-01T00:00:00.000Z"),
  updated_at: new Date("2026-08-02T00:00:00.000Z"),
};

function sourceRow(overrides: Record<string, unknown> = {}) {
  const title = (overrides.title as string | undefined) ?? "关于我们";
  const description = (overrides.description as string | undefined) ?? "描述";
  const sections =
    (overrides.sections as unknown) ??
    [{ type: "hero", settings: { headline: "你好" }, blocks: [] }];
  return {
    id: "page-1",
    tenant_id: TENANT,
    slug: "about",
    locale: "zh-CN",
    kind: "page",
    title,
    description,
    sections,
    title_draft: (overrides.title_draft as string | undefined) ?? title,
    description_draft:
      (overrides.description_draft as string | undefined) ?? description,
    sections_draft: (overrides.sections_draft as unknown) ?? sections,
    settings: {},
    status: "published",
    sort_order: 3,
    created_at: new Date("2026-08-01T00:00:00.000Z"),
    updated_at: new Date("2026-08-02T00:00:00.000Z"),
    ...overrides,
  };
}

/** `create` 的入参就是断言对象；返回值只要能过 mapper 即可。 */
function createdData(): Record<string, unknown> {
  const call = vi.mocked(prisma.marketingPage.create).mock.calls[0]?.[0] as {
    data: Record<string, unknown>;
  };
  return call.data;
}

describe("duplicatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(
      siteRow as never,
    );
    vi.mocked(prisma.marketingPage.create).mockImplementation((async ({
      data,
    }: {
      data: Record<string, unknown>;
    }) => ({
      ...sourceRow(),
      ...data,
      id: "page-2",
    })) as never);
  });

  it("keeps the slug when copying into another language", async () => {
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(
      sourceRow() as never,
    );
    // 目标语言下还没有任何页面
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([] as never);

    const page = await duplicatePage(TENANT, "page-1", {
      title: "About us",
      locale: "en",
    });

    const data = createdData();
    // slug 相同才会与源页面自动成为一组译文
    expect(data.slug).toBe("about");
    expect(data.locale).toBe("en");
    expect(data.title).toBe("About us");
    // 已发布的源页面复制出来仍是草稿：还没译的内容不该跟着上线
    expect(data.status).toBe("draft");
    expect(data.sort_order).toBe(3);
    expect(data.settings).toEqual({});
    expect(page.id).toBe("page-2");
  });

  it("seeds the target language with the source copy", async () => {
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(
      sourceRow() as never,
    );
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([] as never);

    await duplicatePage(TENANT, "page-1", { title: "About", locale: "en" });

    const sections = createdData().sections as Array<{
      settings: Record<string, unknown>;
    }>;
    // 目标语言的槽位先填原文，编辑器里逐条改成译文即可（不搬就是一片空白）
    expect(sections[0]!.settings.headline).toEqual({
      __i18n: { "zh-CN": "你好", en: "你好" },
    });
  });

  it("derives a -copy slug when the language already has that slug", async () => {
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(
      sourceRow() as never,
    );
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([
      { slug: "about" },
      { slug: "about-copy" },
    ] as never);

    await duplicatePage(TENANT, "page-1", { title: "关于我们（副本）" });

    expect(createdData().slug).toBe("about-copy-2");
    expect(createdData().locale).toBe("zh-CN");
  });

  it("refuses a same-language copy of the home page", async () => {
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(
      sourceRow({ kind: "home", slug: "home" }) as never,
    );
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([
      { slug: "home" },
    ] as never);

    // 首页 slug 固定为 home，同语言下只能有一个
    await expect(
      duplicatePage(TENANT, "page-1", { title: "首页副本" }),
    ).rejects.toThrow("site.home_exists");
    expect(prisma.marketingPage.create).not.toHaveBeenCalled();
  });

  it("rejects a blank title and an unknown locale", async () => {
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(
      sourceRow() as never,
    );
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([] as never);

    await expect(
      duplicatePage(TENANT, "page-1", { title: "   " }),
    ).rejects.toThrow("site.page_title_required");
    await expect(
      duplicatePage(TENANT, "page-1", { title: "About", locale: "klingon" }),
    ).rejects.toThrow("site.locale_invalid");
  });

  it("404s on a page from another tenant", async () => {
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(null as never);
    await expect(
      duplicatePage(TENANT, "page-1", { title: "About" }),
    ).rejects.toThrow("site.page_not_found");
  });
});

describe("saveEditorDraft", () => {
  const pageRow = {
    id: "page-1",
    tenant_id: TENANT,
    slug: "home",
    locale: "zh-CN",
    kind: "home",
    title: "首页",
    description: "描述",
    sections: [],
    title_draft: "首页",
    description_draft: "描述",
    sections_draft: [],
    settings: {},
    status: "draft",
    sort_order: 0,
    created_at: new Date("2026-08-01T00:00:00.000Z"),
    updated_at: new Date("2026-08-03T00:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(pageRow as never);
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(siteRow as never);
    vi.mocked(prisma.$transaction).mockImplementation((async (ops: unknown) => {
      const results = [];
      for (const op of ops as Array<Promise<unknown>>) {
        results.push(await op);
      }
      return results;
    }) as never);
    vi.mocked(prisma.marketingPage.update).mockResolvedValue({
      ...pageRow,
      title_draft: "新标题",
      description_draft: "新描述",
    } as never);
    vi.mocked(prisma.marketingSite.update).mockResolvedValue(siteRow as never);
  });

  it("updates page and chrome in one transaction", async () => {
    const body = {
      title: "新标题",
      description: "新描述",
      sections: [
        {
          type: "hero",
          settings: { headline: "你好" },
          blocks: [],
        },
      ],
      header: [{ type: "header", settings: {}, blocks: [] }],
      footer: [{ type: "footer", settings: {}, blocks: [] }],
    };

    const result = await saveEditorDraft(TENANT, "page-1", body);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.marketingPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title_draft: "新标题",
          description_draft: "新描述",
          sections_draft: expect.anything(),
        }),
      }),
    );
    expect(prisma.marketingSite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nav_draft_json: expect.anything(),
          footer_draft_json: expect.anything(),
        }),
      }),
    );
    expect(result.page.title).toBe("新标题");
    expect(result.site.id).toBe("site-1");
  });
});

describe("applySiteStarter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(siteRow as never);
    vi.mocked(prisma.marketingSite.update).mockResolvedValue(siteRow as never);
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.marketingPage.create).mockImplementation((async ({
      data,
    }: {
      data: Record<string, unknown>;
    }) => ({
      id: `page-${data.slug}`,
      tenant_id: TENANT,
      status: "draft",
      settings: {},
      created_at: new Date("2026-08-01T00:00:00.000Z"),
      updated_at: new Date("2026-08-03T00:00:00.000Z"),
      ...data,
    })) as never);
    vi.mocked(prisma.$transaction).mockImplementation((async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn(prisma);
      }
      return fn;
    }) as never);
  });

  it("creates chrome and starter pages in one transaction", async () => {
    const result = await applySiteStarter(TENANT, "default");

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.marketingSite.update).toHaveBeenCalled();
    expect(prisma.marketingPage.create).toHaveBeenCalledTimes(3);
    expect(result.pages).toHaveLength(3);
    expect(result.home_page_id).toBe("page-home");
  });

  it("rejects unknown starter keys", async () => {
    await expect(applySiteStarter(TENANT, "unknown")).rejects.toThrow(
      "site.starter_not_found",
    );
  });
});
