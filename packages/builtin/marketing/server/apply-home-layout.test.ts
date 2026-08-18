import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyHomeLayout } from "./site.service.js";
import { registerHomeLayout } from "../shared/home-layouts.js";
import "../shared/page-presets.js";

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    marketingSite: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    marketingPage: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../platform/server/services/tenant-module.service.js", () => ({
  isTenantModuleEnabled: vi.fn().mockResolvedValue(false),
}));

const TENANT = "tenant-1";

const siteRow = {
  id: "site-1",
  tenant_id: TENANT,
  site_name: "Acme",
  tagline: "",
  theme_settings: {},
  theme_settings_draft: {},
  theme_key: "default",
  default_locale: "zh-CN",
  nav_json: [],
  footer_json: [],
  nav_draft_json: [],
  footer_draft_json: [],
  published: true,
  home_path: "/",
  home_layout_key: "marketing.default",
  created_at: new Date("2026-08-01T00:00:00.000Z"),
  updated_at: new Date("2026-08-02T00:00:00.000Z"),
};

const LAYOUT = {
  key: "apply-test.home",
  label: "marketing:preset.home.layoutLabel",
  preset: {
    key: "apply-test.home",
    label: "marketing:preset.home.layoutLabel",
    kind: "home" as const,
    slug: "home",
    titleKey: "marketing:preset.home.title",
    descriptionKey: "marketing:preset.home.description",
    sections: [{ type: "hero" }],
  },
};

describe("applyHomeLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerHomeLayout(LAYOUT);
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(
      siteRow as never,
    );
    vi.mocked(prisma.marketingSite.findFirstOrThrow).mockResolvedValue(
      siteRow as never,
    );
    vi.mocked(prisma.marketingSite.update).mockResolvedValue(siteRow as never);
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([
      {
        id: "home-1",
        tenant_id: TENANT,
        kind: "home",
        locale: "zh-CN",
      } as never,
    ]);
    vi.mocked(prisma.marketingPage.update).mockResolvedValue({} as never);
  });

  it("不认识的 key 拒收", async () => {
    await expect(applyHomeLayout(TENANT, "no-such")).rejects.toMatchObject({
      code: "site.home_layout_invalid",
    });
  });

  it("记下 key 并替换首页草稿", async () => {
    await applyHomeLayout(TENANT, LAYOUT.key);
    expect(prisma.marketingSite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { home_layout_key: LAYOUT.key },
      }),
    );
    expect(prisma.marketingPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "home-1", tenant_id: TENANT },
        data: expect.objectContaining({
          title_draft: expect.any(String),
          sections_draft: expect.any(Array),
        }),
      }),
    );
  });
});
