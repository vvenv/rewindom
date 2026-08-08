import { describe, expect, it } from "vitest";

import {
  brandingUrlsFromAssets,
  buildTenantBrandingPublicUrl,
  DEFAULT_TENANT_BRANDING,
} from "./tenant-branding.js";

describe("tenant-branding", () => {
  it("buildTenantBrandingPublicUrl appends cache-busting query", () => {
    expect(buildTenantBrandingPublicUrl("acme", "logo", "2026-01-01T00:00:00.000Z")).toBe(
      "/api/public/tenants/acme/branding/logo?v=2026-01-01T00%3A00%3A00.000Z",
    );
  });

  it("brandingUrlsFromAssets returns null when unset", () => {
    expect(brandingUrlsFromAssets("acme", DEFAULT_TENANT_BRANDING)).toEqual({
      logo_url: null,
      favicon_url: null,
    });
  });

  it("brandingUrlsFromAssets builds urls from assets", () => {
    const urls = brandingUrlsFromAssets("acme", {
      logo: {
        storage_key: "t/branding/logo.png",
        mime_type: "image/png",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      favicon: null,
    });
    expect(urls.logo_url).toContain("/api/public/tenants/acme/branding/logo");
    expect(urls.favicon_url).toBeNull();
  });
});
