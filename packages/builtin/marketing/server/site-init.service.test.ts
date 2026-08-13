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
      create: vi.fn(),
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
    vi.mocked(prisma.marketingPage.findFirst).mockImplementation(
      async (args) => {
        const kind = (args as { where?: { kind?: string } } | undefined)?.where
          ?.kind;
        if (kind === GATED_KIND) return null;
        return { id: "existing" } as never;
      },
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
});
