import { beforeEach, describe, expect, it, vi } from "vitest";

const put = vi.fn();
const del = vi.fn();
const createReadStream = vi.fn();
const resolveAbsolutePath = vi.fn();

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    tenantSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    appSetting: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@be-water/server-kernel/infra/file-storage/local-file-storage.js", () => ({
  getFileStorageProvider: () => ({
    put,
    delete: del,
    createReadStream,
    resolveAbsolutePath,
  }),
  buildTenantBrandingStorageKey: (
    tenantId: string,
    kind: string,
    mimeType: string,
  ) => `${tenantId}/branding/${kind}.${mimeType.split("/")[1] ?? "bin"}`,
}));

import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import {
  clearTenantBrandingAsset,
  getTenantBrandingUrls,
  uploadTenantBrandingAsset,
} from "./tenant-branding.service.js";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";

describe("tenant-branding.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenantSetting.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.tenantSetting.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.appSetting.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appSetting.deleteMany).mockResolvedValue({ count: 0 });
  });

  it("getTenantBrandingUrls returns nulls when unset", async () => {
    await expect(getTenantBrandingUrls(TENANT_ID, "acme")).resolves.toEqual({
      logo_url: null,
      favicon_url: null,
    });
  });

  it("uploadTenantBrandingAsset rejects invalid mime", async () => {
    await expect(
      uploadTenantBrandingAsset({
        tenant_id: TENANT_ID,
        tenant_slug: "acme",
        kind: "logo",
        buffer: Buffer.from("x"),
        mime_type: "application/pdf",
      }),
    ).rejects.toMatchObject({ code: "branding.invalid_mime" });
  });

  it("uploadTenantBrandingAsset rejects oversized file", async () => {
    await expect(
      uploadTenantBrandingAsset({
        tenant_id: TENANT_ID,
        tenant_slug: "acme",
        kind: "favicon",
        buffer: Buffer.alloc(300 * 1024),
        mime_type: "image/png",
      }),
    ).rejects.toMatchObject({ code: "branding.file_too_large" });
  });

  it("uploadTenantBrandingAsset stores file and returns url", async () => {
    const urls = await uploadTenantBrandingAsset({
      tenant_id: TENANT_ID,
      tenant_slug: "acme",
      kind: "logo",
      buffer: Buffer.from("png-bytes"),
      mime_type: "image/png",
    });

    expect(put).toHaveBeenCalledOnce();
    expect(prisma.tenantSetting.upsert).toHaveBeenCalledOnce();
    expect(urls.logo_url).toContain("/api/public/tenants/acme/branding/logo");
    expect(urls.favicon_url).toBeNull();
  });

  it("upload replaces previous storage key", async () => {
    vi.mocked(prisma.tenantSetting.findUnique).mockResolvedValue({
      value: {
        logo: {
          storage_key: `${TENANT_ID}/branding/logo.jpg`,
          mime_type: "image/jpeg",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        favicon: null,
      },
    } as never);

    await uploadTenantBrandingAsset({
      tenant_id: TENANT_ID,
      tenant_slug: "acme",
      kind: "logo",
      buffer: Buffer.from("png-bytes"),
      mime_type: "image/png",
    });

    expect(del).toHaveBeenCalledWith(`${TENANT_ID}/branding/logo.jpg`);
  });

  it("clearTenantBrandingAsset deletes file and clears url", async () => {
    vi.mocked(prisma.tenantSetting.findUnique).mockResolvedValue({
      value: {
        logo: {
          storage_key: `${TENANT_ID}/branding/logo.png`,
          mime_type: "image/png",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        favicon: null,
      },
    } as never);

    const urls = await clearTenantBrandingAsset({
      tenant_id: TENANT_ID,
      tenant_slug: "acme",
      kind: "logo",
    });

    expect(del).toHaveBeenCalledWith(`${TENANT_ID}/branding/logo.png`);
    expect(urls.logo_url).toBeNull();
  });
});
