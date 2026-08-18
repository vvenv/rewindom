import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  replaceSiteAsset,
  SITE_ASSET_CACHE_CONTROL,
  siteAssetObjectKey,
} from "./site-asset.service.js";

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    marketingAsset: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const put = vi.fn();

vi.mock("@rewindom/server-kernel/infra/file-storage/index.js", () => ({
  getFileStorageProvider: () => ({
    put,
    delete: vi.fn(),
    open: vi.fn(),
    resolveUrl: vi.fn(),
  }),
}));

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

const TENANT = "tenant-1";
const SLUG = "acme";
const NOW = new Date("2026-08-18T00:00:00.000Z");

function png(width = 10, height = 8): Buffer {
  const buffer = Buffer.alloc(24);
  buffer.writeUInt32BE(0x89504e47, 0);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function assetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset-1",
    tenant_id: TENANT,
    filename: "asset-1.png",
    mime_type: "image/png",
    size_bytes: 24,
    width: 10,
    height: 8,
    alt: "logo",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe("replaceSiteAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the public filename so existing references stay valid", async () => {
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>`,
    );
    vi.mocked(prisma.marketingAsset.findFirst)
      .mockResolvedValueOnce(assetRow())
      .mockResolvedValueOnce(
        assetRow({
          mime_type: "image/svg+xml",
          size_bytes: svg.byteLength,
          width: 0,
          height: 0,
          updated_at: new Date("2026-08-18T01:00:00.000Z"),
        }),
      );
    vi.mocked(prisma.marketingAsset.updateMany).mockResolvedValue({ count: 1 });

    const replaced = await replaceSiteAsset({
      tenant_id: TENANT,
      tenant_slug: SLUG,
      id: "asset-1",
      buffer: svg,
      mime_type: "image/svg+xml",
      filename: "mark.svg",
    });

    expect(put).toHaveBeenCalledWith(
      siteAssetObjectKey(TENANT, "asset-1.png"),
      expect.any(Buffer),
      { mime_type: "image/svg+xml", visibility: "public", cache_control: SITE_ASSET_CACHE_CONTROL },
    );
    expect(replaced?.filename).toBe("asset-1.png");
    expect(replaced?.url).toBe(
      "/api/public/tenants/acme/site-assets/asset-1.png",
    );
    expect(replaced?.mime_type).toBe("image/svg+xml");
  });

  it("returns null when the asset is missing", async () => {
    vi.mocked(prisma.marketingAsset.findFirst).mockResolvedValueOnce(null);

    await expect(
      replaceSiteAsset({
        tenant_id: TENANT,
        tenant_slug: SLUG,
        id: "missing",
        buffer: png(),
        mime_type: "image/png",
      }),
    ).resolves.toBeNull();
    expect(put).not.toHaveBeenCalled();
  });
});
