import { describe, expect, it } from "vitest";

import { toPublicMarketingSite } from "./site.mapper.js";

import type { MarketingSite as MarketingSiteRecord } from "@be-water/server-kernel/generated/prisma/client/client.js";

function siteRecord(
  overrides: Partial<MarketingSiteRecord> = {},
): MarketingSiteRecord {
  return {
    id: "site-1",
    tenant_id: "t-1",
    site_name: "Acme",
    tagline: null,
    theme_settings: {},
    default_locale: "zh-CN",
    nav_json: null,
    footer_json: null,
    published: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as MarketingSiteRecord;
}

const BRANDING = "/api/public/tenants/acme/branding/logo?v=2026-08-04";

describe("toPublicMarketingSite logo", () => {
  it("inherits the tenant branding logo when the site has none", () => {
    const site = toPublicMarketingSite(siteRecord(), [], BRANDING);
    expect(site.logo_url).toBe(BRANDING);
    // 两处渲染都读 theme_settings，回落值必须同时落在那里
    expect(site.theme_settings.logo_url).toBe(BRANDING);
  });

  it("lets the site override the branding logo", () => {
    const site = toPublicMarketingSite(
      siteRecord({ theme_settings: { logo_url: "https://cdn/x.svg" } }),
      [],
      BRANDING,
    );
    expect(site.logo_url).toBe("https://cdn/x.svg");
    expect(site.theme_settings.logo_url).toBe("https://cdn/x.svg");
  });

  it("stays null when neither side has a logo", () => {
    // 没上传过品牌资产时公开端点是 404，不能拼个 URL 顶上去
    const site = toPublicMarketingSite(siteRecord(), [], null);
    expect(site.logo_url).toBeNull();
    expect(site.theme_settings.logo_url).toBeNull();
  });
});
