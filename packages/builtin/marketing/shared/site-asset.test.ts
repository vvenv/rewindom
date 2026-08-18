import { describe, expect, it } from "vitest";

import {
  SITE_ASSET_ACCEPT,
  isSiteAssetFile,
  siteAssetPreviewUrl,
} from "./site-asset.js";

describe("isSiteAssetFile", () => {
  it("accepts svg/webp/avif by MIME or by extension when type is blank", () => {
    expect(isSiteAssetFile({ name: "a.svg", type: "image/svg+xml" })).toBe(true);
    expect(isSiteAssetFile({ name: "a.svg", type: "" })).toBe(true);
    expect(isSiteAssetFile({ name: "a.WEBP", type: "" })).toBe(true);
    expect(isSiteAssetFile({ name: "a.avif", type: "image/avif" })).toBe(true);
    expect(isSiteAssetFile({ name: "a.ico", type: "image/x-icon" })).toBe(true);
  });

  it("rejects non-images even if the name looks close", () => {
    expect(isSiteAssetFile({ name: "notes.pdf", type: "application/pdf" })).toBe(
      false,
    );
    expect(isSiteAssetFile({ name: "clip.mp4", type: "" })).toBe(false);
  });
});

describe("SITE_ASSET_ACCEPT", () => {
  it("lists both MIME types and extensions so OS file dialogs show svg/webp", () => {
    expect(SITE_ASSET_ACCEPT).toContain("image/svg+xml");
    expect(SITE_ASSET_ACCEPT).toContain("image/webp");
    expect(SITE_ASSET_ACCEPT).toContain(".svg");
    expect(SITE_ASSET_ACCEPT).toContain(".webp");
    expect(SITE_ASSET_ACCEPT).toContain(".avif");
  });
});

describe("siteAssetPreviewUrl", () => {
  it("appends updated_at without rewriting the stored URL", () => {
    expect(
      siteAssetPreviewUrl({
        url: "/api/public/tenants/acme/site-assets/a.png",
        updated_at: "2026-08-18T01:00:00.000Z",
      }),
    ).toBe(
      "/api/public/tenants/acme/site-assets/a.png?v=2026-08-18T01%3A00%3A00.000Z",
    );
  });
});
