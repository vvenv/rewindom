import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applySiteStarter,
  duplicatePage,
  reorderPages,
  revertEditorDraft,
  saveEditorDraft,
} from "./site.service.js";

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
      count: vi.fn(),
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
  const sections = (overrides.sections as unknown) ?? [
    { type: "hero", settings: { headline: "你好" }, blocks: [] },
  ];
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
    settings_draft: {},
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

  it("refuses a same-language copy of a doc template page", async () => {
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(
      sourceRow({ kind: "doc_index", slug: "docs", title: "文档" }) as never,
    );
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([
      { slug: "docs" },
    ] as never);

    await expect(
      duplicatePage(TENANT, "page-1", { title: "文档副本" }),
    ).rejects.toThrow("site.doc_template_exists");
    expect(prisma.marketingPage.create).not.toHaveBeenCalled();
  });

  it("keeps the fixed doc template slug when copying into another language", async () => {
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(
      sourceRow({ kind: "doc_index", slug: "docs", title: "文档" }) as never,
    );
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([] as never);

    await duplicatePage(TENANT, "page-1", {
      title: "Docs",
      locale: "en",
    });

    expect(createdData().slug).toBe("docs");
    expect(createdData().kind).toBe("doc_index");
    expect(createdData().locale).toBe("en");
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
    settings_draft: {},
    status: "draft",
    sort_order: 0,
    created_at: new Date("2026-08-01T00:00:00.000Z"),
    updated_at: new Date("2026-08-03T00:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(
      pageRow as never,
    );
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(
      siteRow as never,
    );
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

  // 页面设置也是要发布才上线的——写进 `settings` 就等于绕过发布直接改了线上
  it("writes page settings to the draft column", async () => {
    await saveEditorDraft(TENANT, "page-1", {
      title: "新标题",
      description: "新描述",
      sections: [],
      header: [],
      footer: [],
      settings: { bg_color: "#101010" },
    });

    const data = vi.mocked(prisma.marketingPage.update).mock
      .calls[0]?.[0] as unknown as { data: Record<string, unknown> };
    expect(data.data.settings_draft).toEqual({ bg_color: "#101010" });
    expect(data.data.settings).toBeUndefined();
  });
});

describe("revertEditorDraft", () => {
  const livePageRow = {
    ...sourceRow(),
    title: "线上标题",
    description: "线上描述",
    // section 的 id 要显式给：缺 id 时 schema 每次解析都补一个随机的，
    // 前后两次比对必然不等，`content_dirty` 就永远是 true
    sections: [
      { id: "s1", type: "hero", settings: { headline: "线上" }, blocks: [] },
    ],
    settings: { bg_color: "#ffffff" },
    title_draft: "草稿标题",
    description_draft: "草稿描述",
    sections_draft: [
      { id: "s1", type: "hero", settings: { headline: "草稿" }, blocks: [] },
    ],
    settings_draft: { bg_color: "#000000" },
    status: "published",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(
      livePageRow as never,
    );
    vi.mocked(prisma.marketingPage.update).mockImplementation((async (args: {
      data: Record<string, unknown>;
    }) => ({ ...livePageRow, ...args.data })) as never);
  });

  beforeEach(() => {
    vi.mocked(prisma.marketingSite.findFirstOrThrow).mockResolvedValue(
      siteRow as never,
    );
    vi.mocked(prisma.marketingSite.update).mockResolvedValue(siteRow as never);
    vi.mocked(prisma.$transaction).mockImplementation((async (ops: unknown) => {
      const results = [];
      for (const op of ops as Array<Promise<unknown>>) results.push(await op);
      return results;
    }) as never);
  });

  it("resets every draft column to the live one", async () => {
    const { page } = await revertEditorDraft(TENANT, "page-1");

    const data = vi.mocked(prisma.marketingPage.update).mock
      .calls[0]?.[0] as unknown as { data: Record<string, unknown> };
    // 四列一组全部回灌；sections 过 schema 时会补默认值，所以只认关键字段
    expect(Object.keys(data.data).sort()).toEqual([
      "description_draft",
      "sections_draft",
      "settings_draft",
      "title_draft",
    ]);
    expect(data.data.title_draft).toBe("线上标题");
    expect(data.data.description_draft).toBe("线上描述");
    expect(data.data.settings_draft).toEqual({ bg_color: "#ffffff" });
    expect(
      (
        data.data.sections_draft as Array<{ settings: { headline: unknown } }>
      )[0]?.settings.headline,
    ).toBe("线上");
    // 撤销后草稿等于线上，编辑器的「有未发布的更改」随之熄灭
    expect(page.title).toBe("线上标题");
    expect(page.settings).toEqual({ bg_color: "#ffffff" });
    expect(page.content_dirty).toBe(false);
  });

  // 没上线过的页面，无后缀列里躺的是建页初值，不是用户见过的「线上版」——
  // 所以正文一列都不动；页头页脚是站点级的，照常还原
  it("leaves content alone on a page that was never published", async () => {
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue({
      ...livePageRow,
      status: "draft",
    } as never);

    await revertEditorDraft(TENANT, "page-1");

    const data = vi.mocked(prisma.marketingPage.update).mock
      .calls[0]?.[0] as unknown as { data: Record<string, unknown> };
    expect(data.data).toEqual({});
    expect(prisma.marketingSite.update).toHaveBeenCalled();
  });

  it("404s on a page from another tenant", async () => {
    vi.mocked(prisma.marketingPage.findFirst).mockResolvedValue(null as never);

    await expect(revertEditorDraft(TENANT, "page-1")).rejects.toThrow(
      "site.page_not_found",
    );
  });
});

describe("applySiteStarter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(
      siteRow as never,
    );
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
    // 起步模板只建首页；docs / pricing 已降级为按需添加的页面预设
    expect(prisma.marketingPage.create).toHaveBeenCalledTimes(1);
    expect(result.pages).toHaveLength(1);
    expect(result.home_page_id).toBe("page-home");
  });

  it("rejects unknown starter keys", async () => {
    await expect(applySiteStarter(TENANT, "unknown")).rejects.toThrow(
      "site.starter_not_found",
    );
  });
});

describe("reorderPages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);
  });

  it("writes every page's sort_order in one transaction", async () => {
    vi.mocked(prisma.marketingPage.count).mockResolvedValue(2 as never);

    await reorderPages(TENANT, {
      items: [
        { id: "page-1", sort_order: 0 },
        { id: "page-2", sort_order: 1 },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    // 写入本身也要租户闭合：只按 id 更新会让别的租户的页面被重排
    expect(prisma.marketingPage.update).toHaveBeenCalledWith({
      where: { id: "page-1", tenant_id: TENANT },
      data: { sort_order: 0 },
    });
    expect(prisma.marketingPage.update).toHaveBeenCalledTimes(2);
  });

  it("rejects the whole batch when an id is not the tenant's", async () => {
    // 少排一页比排错更难发现：一律拒收，而不是静默跳过不属于本租户的 id
    vi.mocked(prisma.marketingPage.count).mockResolvedValue(1 as never);

    await expect(
      reorderPages(TENANT, {
        items: [
          { id: "page-1", sort_order: 0 },
          { id: "stranger", sort_order: 1 },
        ],
      }),
    ).rejects.toThrow("site.page_not_found");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicate ids", async () => {
    await expect(
      reorderPages(TENANT, {
        items: [
          { id: "page-1", sort_order: 0 },
          { id: "page-1", sort_order: 1 },
        ],
      }),
    ).rejects.toThrow("site.page_order_invalid");
  });
});
