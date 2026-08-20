import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPublishedPublicPage } from "./site.service.js";

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    marketingSite: {
      findFirst: vi.fn(),
    },
    marketingPage: {
      findMany: vi.fn(),
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
  default_locale: "zh-CN",
  nav_json: [],
  footer_json: [],
  nav_draft_json: [],
  footer_draft_json: [],
  published: true,
  created_at: new Date("2026-08-01T00:00:00.000Z"),
  updated_at: new Date("2026-08-02T00:00:00.000Z"),
};

describe("getPublishedPublicPage home fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.marketingSite.findFirst).mockResolvedValue(siteRow as never);
    vi.mocked(prisma.marketingPage.findMany).mockResolvedValue([]);
  });

  it("renders the built-in home layout when no home page is stored", async () => {
    const result = await getPublishedPublicPage(TENANT, "/", "acme");

    expect(result).not.toBeNull();
    expect(result!.page.path).toBe("/");
    expect(result!.page.kind).toBe("home");
    // 内置首页版式是空白的（见 `HOME_STARTER_PRESET`）：兜底渲染的是页头页脚 + 空正文
    expect(result!.page.sections).toEqual([]);
    expect(result!.page.title).toBe("首页");
  });

  it("still 404s for other paths when no page exists", async () => {
    await expect(
      getPublishedPublicPage(TENANT, "/about", "acme"),
    ).resolves.toBeNull();
  });
});
