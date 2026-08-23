import { beforeEach, describe, expect, it, vi } from "vitest";

const pageFindMany = vi.fn();
const siteFindFirst = vi.fn();

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    marketingSite: { findFirst: (...a: unknown[]) => siteFindFirst(...a) },
    marketingPage: { findMany: (...a: unknown[]) => pageFindMany(...a) },
  },
}));
vi.mock("@rewindom/server-kernel/lib/tenant-scope.js", () => ({
  withTenantScope: (tenantId: string, where: Record<string, unknown> = {}) => ({
    tenant_id: tenantId,
    ...where,
  }),
}));

const { findPagesUsingSection } = await import("./section-usage.service.js");

const TYPE = "newsletter.subscribe";

function page(overrides: Record<string, unknown> = {}) {
  return {
    slug: "about",
    locale: "zh-CN",
    kind: "page",
    status: "published",
    title: "关于",
    title_draft: "关于",
    sections: [],
    sections_draft: [{ type: TYPE, settings: {} }],
    ...overrides,
  };
}

beforeEach(() => {
  siteFindFirst.mockResolvedValue({ default_locale: "zh-CN" });
  pageFindMany.mockReset();
});

describe("findPagesUsingSection", () => {
  it("找出摆了这个段的页面", async () => {
    pageFindMany.mockResolvedValue([page()]);
    const usages = await findPagesUsingSection("t1", TYPE);
    expect(usages).toHaveLength(1);
    expect(usages[0]!.page_title).toBe("关于");
    expect(usages[0]!.page_path).toBe("/about");
  });

  it("没摆的页面不列", async () => {
    pageFindMany.mockResolvedValue([
      page({ sections_draft: [{ type: "hero", settings: {} }] }),
    ]);
    expect(await findPagesUsingSection("t1", TYPE)).toEqual([]);
  });

  it("看的是草稿——编辑器里刚摆上去还没发布的那一版才是租户正在配的", async () => {
    pageFindMany.mockResolvedValue([
      page({ sections: [], sections_draft: [{ type: TYPE, settings: {} }] }),
    ]);
    expect(await findPagesUsingSection("t1", TYPE)).toHaveLength(1);
  });

  it("容器段的列里也要找到——不然摆进两列布局的页面会凭空消失", async () => {
    pageFindMany.mockResolvedValue([
      page({
        sections_draft: [
          {
            type: "group",
            settings: {},
            blocks: [
              { sections: [{ type: TYPE, settings: { anchor: "sub" } }] },
            ],
          },
        ],
      }),
    ]);
    const usages = await findPagesUsingSection("t1", TYPE);
    expect(usages).toHaveLength(1);
    expect(usages[0]!.anchor).toBe("sub");
  });

  it("锚点没填就是 null——没有可跳的目标，调用方据此不列锚点候选", async () => {
    pageFindMany.mockResolvedValue([page()]);
    expect((await findPagesUsingSection("t1", TYPE))[0]!.anchor).toBeNull();
  });

  it("同一路径的多语言版本只出一条", async () => {
    pageFindMany.mockResolvedValue([
      page(),
      page({ locale: "en", title: "About", title_draft: "About" }),
    ]);
    const usages = await findPagesUsingSection("t1", TYPE);
    expect(usages).toHaveLength(1);
    // 默认语言（zh-CN）的标题优先
    expect(usages[0]!.page_title).toBe("关于");
  });

  it("段只摆在非默认语言那一版上，也要找得到", async () => {
    /*
     * 这条是真出过的 bug：站点默认语言是 en、租户把订阅段加在中文版首页上，
     * 照抄 `listSiteLinkTargets` 的「只看默认语言那一版」会让这个接口什么都找不到。
     * 列页面与检测段用在哪问的不是同一件事——正文是**逐语言各一份**的。
     */
    siteFindFirst.mockResolvedValue({ default_locale: "en" });
    pageFindMany.mockResolvedValue([
      page({ locale: "en", sections_draft: [{ type: "hero", settings: {} }] }),
      page({ locale: "zh-CN" }),
    ]);
    expect(await findPagesUsingSection("t1", TYPE)).toHaveLength(1);
  });

  it("任一语言已发布，这个地址就不算草稿", async () => {
    pageFindMany.mockResolvedValue([
      page({ locale: "zh-CN", status: "draft" }),
      page({ locale: "en", status: "published" }),
    ]);
    expect((await findPagesUsingSection("t1", TYPE))[0]!.draft).toBe(false);
  });

  it("锚点只填在其中一种语言上也认", async () => {
    pageFindMany.mockResolvedValue([
      page({ locale: "zh-CN" }),
      page({
        locale: "en",
        sections_draft: [{ type: TYPE, settings: { anchor: "sub" } }],
      }),
    ]);
    expect((await findPagesUsingSection("t1", TYPE))[0]!.anchor).toBe("sub");
  });

  it("草稿页照列但标出来——先配导航后发布是常见顺序", async () => {
    pageFindMany.mockResolvedValue([page({ status: "draft" })]);
    expect((await findPagesUsingSection("t1", TYPE))[0]!.draft).toBe(true);
  });

  it("正文是坏数据时不炸", async () => {
    pageFindMany.mockResolvedValue([
      page({ sections_draft: "not-an-array" }),
      page({ sections_draft: [null, 42, { settings: {} }] }),
    ]);
    expect(await findPagesUsingSection("t1", TYPE)).toEqual([]);
  });
});

describe("首页", () => {
  it("首页要列出来——它是最可能摆订阅段的那一页", async () => {
    /*
     * 首页也登记成模板 kind（marketing 自己登记的），但它有真实可打开的地址 `/`。
     * 跟着「模板页不列」一起滤掉的话，这个接口在最常见的场景里什么都找不到。
     */
    pageFindMany.mockResolvedValue([
      page({ slug: "home", kind: "home", title: "首页", title_draft: "首页" }),
    ]);
    const usages = await findPagesUsingSection("t1", TYPE);
    expect(usages).toHaveLength(1);
    expect(usages[0]!.page_path).toBe("/");
  });

  it("带参数的模板路径不列——它代表一类内容，不是能打开的地址", async () => {
    const { registerPageTemplateKind } =
      await import("../shared/page-templates.js");
    registerPageTemplateKind({
      kind: "probe_detail",
      slug: "probe-detail",
      path: "/probe/:slug",
      group: "probe",
      label: "probe",
      required_section: null,
      auto_init: false,
    });
    pageFindMany.mockResolvedValue([
      page({ slug: "probe-detail", kind: "probe_detail" }),
    ]);
    expect(await findPagesUsingSection("t1", TYPE)).toEqual([]);
  });

  it("无参数的模板页要列——订阅页 /subscribe、404 都是能打开的地址", async () => {
    /*
     * 判据是路径带不带参数，不是「它是不是模板页」。按 kind 一刀切过——
     * 首页被误杀过一次，订阅页又被误杀了第二次。
     */
    pageFindMany.mockResolvedValue([page({ slug: "404", kind: "not_found" })]);
    expect((await findPagesUsingSection("t1", TYPE))[0]!.page_path).toBe(
      "/404",
    );
  });
});

describe("标签里的 token", () => {
  beforeEach(() => {
    siteFindFirst.mockResolvedValue({
      default_locale: "zh-CN",
      site_name: { __i18n: { "zh-CN": "示例站", en: "Demo" } },
      tagline: "标语",
    });
  });

  it("首页标题里的 {site} 要替掉——原样拿去当候选名字会显示成「{site}」", async () => {
    pageFindMany.mockResolvedValue([
      page({
        slug: "home",
        kind: "home",
        title: "{site}",
        title_draft: "{site}",
      }),
    ]);
    expect((await findPagesUsingSection("t1", TYPE))[0]!.page_title).toBe(
      "示例站",
    );
  });

  it("替不掉的 token 退回路径，不把花括号摊给人看", async () => {
    // {topic} 这类要页面上下文才有值，链接候选里无从解起
    pageFindMany.mockResolvedValue([
      page({ title: "{topic} 专题", title_draft: "{topic} 专题" }),
    ]);
    expect((await findPagesUsingSection("t1", TYPE))[0]!.page_title).toBe(
      "/about",
    );
  });

  it("站名是纯字符串（单语言站）也认", async () => {
    siteFindFirst.mockResolvedValue({
      default_locale: "zh-CN",
      site_name: "单语言站",
      tagline: "",
    });
    pageFindMany.mockResolvedValue([
      page({ title: "{site}", title_draft: "{site}" }),
    ]);
    expect((await findPagesUsingSection("t1", TYPE))[0]!.page_title).toBe(
      "单语言站",
    );
  });
});
