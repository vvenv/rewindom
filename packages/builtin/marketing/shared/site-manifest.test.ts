import { describe, expect, it } from "vitest";

import { buildSiteWebManifest } from "./site-manifest.js";

describe("buildSiteWebManifest", () => {
  it("takes the site name and primary colour", () => {
    expect(
      buildSiteWebManifest({
        name: "Yestino",
        theme_color: "#4F46E5",
        maskable_icon_url: "/uploads/mask.png",
      }),
    ).toEqual({
      name: "Yestino",
      short_name: "Yestino",
      start_url: "/",
      display: "standalone",
      theme_color: "#4F46E5",
      background_color: "#ffffff",
      icons: [
        {
          src: "/uploads/mask.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    });
  });

  it("omits theme_color and icons when they are not set", () => {
    const manifest = buildSiteWebManifest({ name: "Acme" });
    expect(manifest).not.toHaveProperty("theme_color");
    expect(manifest.icons).toEqual([]);
    expect(manifest.background_color).toBe("#ffffff");
  });

  it("uses an opaque canvas colour when given, and ignores alpha", () => {
    expect(
      buildSiteWebManifest({ name: "Acme", background_color: "#0a0a0a" })
        .background_color,
    ).toBe("#0a0a0a");
    expect(
      buildSiteWebManifest({ name: "Acme", background_color: "#0a0a0a80" })
        .background_color,
    ).toBe("#ffffff");
  });

  it("does not invent a favicon icon — rounded favicons get clipped twice", () => {
    const manifest = buildSiteWebManifest({
      name: "Acme",
      maskable_icon_url: null,
    });
    expect(manifest.icons).toEqual([]);
  });
});
