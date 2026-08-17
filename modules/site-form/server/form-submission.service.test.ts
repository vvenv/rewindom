/**
 * 公开表单提交 —— 这是模块唯一一条匿名写库的路径，所以这里守的全是「能不能骗过去」。
 */

import { getPublishedPublicPage } from "@rewindom/builtin/marketing/server/site.service.js";
import {
  createSection,
  registerSectionDefinition,
  type SiteSection,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { prisma } from "@rewindom/module-sdk/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  formSection as formSectionDefinition,
  SITE_FORM_SECTION_TYPE,
} from "../shared/sections/form/definition.js";

import {
  resetSiteFormRateLimit,
  submitSiteForm,
} from "./form-submission.service.js";

vi.mock("@rewindom/module-sdk/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@rewindom/module-sdk/server")>();
  return {
    ...actual,
    prisma: { siteFormSubmission: { create: vi.fn() } },
  };
});

vi.mock("@rewindom/builtin/marketing/server/site.service.js", () => ({
  getPublishedPublicPage: vi.fn(),
}));

// 段定义是模块在 onBoot / client manifest 里注册的；单测里自己登记一次
registerSectionDefinition(formSectionDefinition);

const TENANT = "tenant-1";

function formSection(): SiteSection {
  const section = createSection(SITE_FORM_SECTION_TYPE);
  section.id = "sec-form";
  section.settings.heading = "联系我们";
  section.blocks = [
    {
      id: "name",
      type: "field",
      settings: { label: "姓名", type: "text", required: true } as never,
    },
    {
      id: "plan",
      type: "field",
      settings: { label: "套餐", type: "select", options: "A\nB" } as never,
    },
  ];
  return section;
}

/** `getPublishedPublicPage` 的最小返回：只有本用例关心的那几个字段。 */
function publishPage(sections: SiteSection[]): void {
  vi.mocked(getPublishedPublicPage).mockResolvedValue({
    site: {} as never,
    page: { slug: "contact", locale: "zh-CN", sections } as never,
  });
}

function submit(overrides: Record<string, unknown> = {}) {
  return submitSiteForm({
    tenant_id: TENANT,
    tenant_slug: "acme",
    path: "/contact",
    locale: null,
    section_id: "sec-form",
    values: { name: "小明" },
    ip: "1.2.3.4",
    user_agent: "vitest",
    ...overrides,
  } as Parameters<typeof submitSiteForm>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetSiteFormRateLimit();
  publishPage([formSection()]);
});

describe("提交", () => {
  it("入库的是自描述条目，带提交当时的标签", async () => {
    await expect(submit()).resolves.toEqual({ status: "ok" });

    const { data, form_title, page_slug } = vi.mocked(
      prisma.siteFormSubmission.create,
    ).mock.calls[0]![0].data as never as {
      data: unknown;
      form_title: string;
      page_slug: string;
    };
    expect(data).toEqual([{ id: "name", label: "姓名", value: "小明" }]);
    // 段被改名或删掉之后，后台列表还得认得出这条是从哪来的
    expect(form_title).toBe("联系我们");
    expect(page_slug).toBe("contact");
  });

  it("找得到容器段列里的表单", async () => {
    const group = createSection("group");
    group.blocks[0]!.sections = [formSection()];
    publishPage([group]);

    await expect(submit()).resolves.toEqual({ status: "ok" });
  });
});

describe("不给探测者任何反馈", () => {
  it("站点没发布 → 404", async () => {
    vi.mocked(getPublishedPublicPage).mockResolvedValue(null);
    await expect(submit()).resolves.toEqual({ status: "not_found" });
  });

  it("段不在这一页 → 404", async () => {
    await expect(submit({ section_id: "别的段" })).resolves.toEqual({
      status: "not_found",
    });
  });

  it("段存在但不是表单 → 同样 404，不区分", async () => {
    const hero = createSection("hero");
    hero.id = "sec-form";
    publishPage([hero]);
    await expect(submit()).resolves.toEqual({ status: "not_found" });
  });
});

describe("字段表以已发布正文为准，不信客户端", () => {
  it("多送的字段不入库", async () => {
    await submit({ values: { name: "小明", injected: "坏东西" } });

    const { data } = vi.mocked(prisma.siteFormSubmission.create).mock
      .calls[0]![0].data as never as { data: Array<{ id: string }> };
    expect(data.map((entry) => entry.id)).toEqual(["name"]);
  });

  it("下拉送了列表外的值 → 逐字段驳回", async () => {
    await expect(
      submit({ values: { name: "小明", plan: "C" } }),
    ).resolves.toEqual({
      status: "invalid",
      fields: { plan: "site.form.option" },
    });
    expect(prisma.siteFormSubmission.create).not.toHaveBeenCalled();
  });

  it("必填缺失 → 驳回且不入库", async () => {
    await expect(submit({ values: {} })).resolves.toEqual({
      status: "invalid",
      fields: { name: "site.form.required" },
    });
    expect(prisma.siteFormSubmission.create).not.toHaveBeenCalled();
  });
});

describe("限流", () => {
  it("同一 IP 连灌到上限就挡住", async () => {
    for (let i = 0; i < 5; i += 1) {
      await expect(submit()).resolves.toEqual({ status: "ok" });
    }
    await expect(submit()).resolves.toEqual({ status: "rate_limited" });
  });

  it("按 IP 计，不误伤别的访客", async () => {
    for (let i = 0; i < 5; i += 1) await submit();
    await expect(submit({ ip: "5.6.7.8" })).resolves.toEqual({ status: "ok" });
  });

  it("打不存在的段不消耗配额", async () => {
    for (let i = 0; i < 20; i += 1) await submit({ section_id: "不存在" });
    await expect(submit()).resolves.toEqual({ status: "ok" });
  });
});
