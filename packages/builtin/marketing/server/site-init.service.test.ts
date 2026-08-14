import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import {
  registerPageTemplateKind,
  registerPageTemplatePreset,
} from "../shared/page-templates.js";

import { initializeTenantSite } from "./site-init.service.js";

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    marketingSite: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    marketingPage: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../platform/server/services/tenant-module.service.js", () => ({
  isTenantModuleEnabled: vi.fn(),
}));

vi.mock("../../platform/server/services/platform-settings.service.js", () => ({
  getPlatformSettings: vi.fn(),
}));

const TENANT = "tenant-init-1";
const GATED_KIND = "init_test_gated";
const GATED_ENTITLEMENT = "init-test-mod";

const siteRow = {
  id: "site-1",
  tenant_id: TENANT,
  site_name: "Acme",
  tagline: "",
  theme_settings: {},
  default_locale: "zh-CN",
  published: false,
  created_at: new Date("2026-08-01T00:00:00.000Z"),
  updated_at: new Date("2026-08-02T00:00:00.000Z"),
};

registerPageTemplateKind({
  kind: GATED_KIND,
  slug: "init-test-gated",
  path: "/init-test-gated",
  group: "init-test:group",
  label: "init-test:label",
  required_section: null,
  entitlement: GATED_ENTITLEMENT,
});
registerPageTemplatePreset(GATED_KIND, {
  key: GATED_KIND,
  label: "init-test:label",
  kind: GATED_KIND,
  slug: "init-test-gated",
  titleKey: "preset.home.title",
  descriptionKey: "preset.home.description",
  sections: [
    {
      type: "page-header",
      text: { headline: "preset.home.title" },
    },
  ],
});

function createdKinds(): string[] {
  return vi.mocked(prisma.marketingPage.create).mock.calls.map((call) => {
    const data = (call[0] as { data: { kind: string } }).data;
    return data.kind;
  });
}

describe("initializeTenantSite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(
      siteRow as never,
    );
    vi.mocked(prisma.marketingPage.create).mockResolvedValue({
      id: "page-new",
    } as never);
    vi.mocked(prisma.marketingPage.updateMany).mockResolvedValue({
      count: 0,
    } as never);
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.marketingPage.update).mockResolvedValue({} as never);
    vi.mocked(prisma.marketingPage.findFirst).mockImplementation(
      (async (args: { where?: { kind?: string } } | undefined) => {
        const kind = args?.where?.kind;
        if (kind === GATED_KIND) return null;
        return { id: "existing" } as never;
      }) as never,
    );
  });

  it("开通了 entitlement 才快照对应模板页", async () => {
    vi.mocked(isTenantModuleEnabled).mockImplementation(async (_id, key) => {
      return key === GATED_ENTITLEMENT;
    });

    const result = await initializeTenantSite(TENANT, "zh-CN");

    expect(result.created_pages).toContain(GATED_KIND);
    expect(createdKinds()).toContain(GATED_KIND);
  });

  it("没开通 entitlement 不预建对应模板页", async () => {
    vi.mocked(isTenantModuleEnabled).mockResolvedValue(false);

    const result = await initializeTenantSite(TENANT, "zh-CN");

    expect(result.created_pages).not.toContain(GATED_KIND);
    expect(createdKinds()).not.toContain(GATED_KIND);
  });

  it("已发布站点补建的页面直接是 published，避免线上还停在兜底版式", async () => {
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue({
      ...siteRow,
      published: true,
    } as never);
    vi.mocked(isTenantModuleEnabled).mockImplementation(async (_id, key) => {
      return key === GATED_ENTITLEMENT;
    });

    await initializeTenantSite(TENANT, "zh-CN");

    const gated = vi
      .mocked(prisma.marketingPage.create)
      .mock.calls.map(
        (call) => (call[0] as { data: { kind: string; status: string } }).data,
      )
      .find((data) => data.kind === GATED_KIND);
    expect(gated?.status).toBe("published");
  });

  it("把旧的 slug=404 普通页升成 not_found 模板", async () => {
    vi.mocked(isTenantModuleEnabled).mockResolvedValue(false);

    await initializeTenantSite(TENANT, "zh-CN");

    expect(prisma.marketingPage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { kind: "not_found" },
      }),
    );
  });

  it("快照 404 模板时默认 noindex", async () => {
    vi.mocked(isTenantModuleEnabled).mockResolvedValue(false);
    vi.mocked(prisma.marketingPage.findFirst).mockImplementation(
      (async (args: { where?: { kind?: string } } | undefined) => {
        const kind = args?.where?.kind;
        if (kind === "not_found" || kind === GATED_KIND) return null;
        return { id: "existing" } as never;
      }) as never,
    );

    await initializeTenantSite(TENANT, "zh-CN");

    const created = vi
      .mocked(prisma.marketingPage.create)
      .mock.calls.map(
        (call) =>
          (
            call[0] as {
              data: { kind: string; settings: { noindex?: boolean } };
            }
          ).data,
      )
      .find((data) => data.kind === "not_found");
    expect(created?.settings).toEqual({ noindex: true });
  });

  it("把还没有必备段的 404 页换成当前预设", async () => {
    vi.mocked(isTenantModuleEnabled).mockResolvedValue(false);
    const hero = {
      id: "hero-1",
      type: "hero",
      settings: {
        eyebrow: "404",
        headline: "页面不存在",
        subhead: "链接过期了",
        primary_label: "回到首页",
        primary_href: "/",
      },
      blocks: [],
    };
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([
      {
        id: "nf-1",
        locale: "zh-CN",
        sections: [hero],
        sections_draft: [hero],
      },
    ] as never);

    await initializeTenantSite(TENANT, "zh-CN");

    expect(prisma.marketingPage.update).toHaveBeenCalledOnce();
    const data = (
      vi.mocked(prisma.marketingPage.update).mock.calls[0]![0] as {
        data: { sections: Array<{ type: string; settings: { headline?: string } }> };
      }
    ).data;
    expect(data.sections[0]?.type).toBe("page-missing");
    expect(data.sections).toHaveLength(1);
  });
});
