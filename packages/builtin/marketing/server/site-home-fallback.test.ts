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
    expect(result!.page.sections.map((section) => section.type)).toEqual([
      "hero",
      "prose",
      "band",
    ]);
    expect(result!.page.title).toBe("首页");
  });

  it("still 404s for other paths when no page exists", async () => {
    await expect(
      getPublishedPublicPage(TENANT, "/about", "acme"),
    ).resolves.toBeNull();
  });
});
