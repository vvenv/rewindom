import { describe, expect, it } from "vitest";

import { parseSiteAssetIdFromThumbnailUrl } from "./save-thumbnail.js";

describe("parseSiteAssetIdFromThumbnailUrl", () => {
  const id = "2c1a0b8e-4d3f-4a1b-9c2d-8e7f6a5b4c3d";

  it("从本租户媒体库路径里取出 id", () => {
    expect(
      parseSiteAssetIdFromThumbnailUrl(
        `/api/public/tenants/rewindom/site-assets/${id}.jpg`,
        "rewindom",
      ),
    ).toBe(id);
  });

  it("带 origin / 查询串也能认", () => {
    expect(
      parseSiteAssetIdFromThumbnailUrl(
        `http://localhost:7300/api/public/tenants/rewindom/site-assets/${id}.jpeg?v=1`,
        "rewindom",
      ),
    ).toBe(id);
  });

  it("PNG 扩展名也能认", () => {
    expect(
      parseSiteAssetIdFromThumbnailUrl(
        `/api/public/tenants/rewindom/site-assets/${id}.png`,
        "rewindom",
      ),
    ).toBe(id);
  });

  it("别人家的图不认", () => {
    expect(
      parseSiteAssetIdFromThumbnailUrl(
        `/api/public/tenants/other/site-assets/${id}.jpg`,
        "rewindom",
      ),
    ).toBeNull();
  });
});
