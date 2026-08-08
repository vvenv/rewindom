/**
 * 重定向查找。
 *
 * 关键是**只跳一跳**与「先页面后重定向」这两条顺序约定——它们决定的是访客会不会打转、
 * 以及租户后来建的同名页打不打得开。
 */

import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { findSiteRedirect, saveSiteRedirect } from "./site-redirect.service.js";

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    marketingRedirect: { findFirst: vi.fn(), upsert: vi.fn() },
  },
}));

const TENANT = "tenant-1";

const row = {
  id: "r1",
  from_path: "/old",
  to_path: "/new",
  status_code: 301,
  created_at: new Date("2026-08-07T00:00:00Z"),
  updated_at: new Date("2026-08-07T00:00:00Z"),
};

beforeEach(() => vi.clearAllMocks());

describe("findSiteRedirect", () => {
  it("按归一化后的路径查：/old/ 与 /old?x=1 命中同一条", async () => {
    vi.mocked(prisma.marketingRedirect.findFirst).mockResolvedValue(
      row as never,
    );

    await findSiteRedirect(TENANT, "/old/?utm=1");

    const where = vi.mocked(prisma.marketingRedirect.findFirst).mock
      .calls[0]![0]!.where as { from_path: string };
    expect(where.from_path).toBe("/old");
  });

  it("路径本身非法（不是站内路径）时不查库，直接算未命中", async () => {
    await expect(
      findSiteRedirect(TENANT, "https://evil.example"),
    ).resolves.toBeNull();
    expect(prisma.marketingRedirect.findFirst).not.toHaveBeenCalled();
  });

  it("没命中返回 null，交给 404 那条路", async () => {
    vi.mocked(prisma.marketingRedirect.findFirst).mockResolvedValue(null);
    await expect(findSiteRedirect(TENANT, "/nope")).resolves.toBeNull();
  });

  it("只查一次——不跟着目标继续解析下一跳", async () => {
    vi.mocked(prisma.marketingRedirect.findFirst).mockResolvedValue(
      row as never,
    );
    const found = await findSiteRedirect(TENANT, "/old");

    expect(found?.to_path).toBe("/new");
    expect(prisma.marketingRedirect.findFirst).toHaveBeenCalledTimes(1);
  });
});

describe("saveSiteRedirect", () => {
  it("按 from_path upsert：重复添加同一个源等于改目标，不是撞唯一键报错", async () => {
    vi.mocked(prisma.marketingRedirect.upsert).mockResolvedValue({
      ...row,
      to_path: "/newer",
    } as never);

    await saveSiteRedirect(TENANT, { from_path: "/old", to_path: "/newer" });

    const args = vi.mocked(prisma.marketingRedirect.upsert).mock.calls[0]![0]!;
    expect(args.where).toEqual({
      tenant_id_from_path: { tenant_id: TENANT, from_path: "/old" },
    });
    expect(args.update).toEqual({ to_path: "/newer", status_code: 301 });
  });

  it("非法规则在落库前就被拒", async () => {
    await expect(
      saveSiteRedirect(TENANT, { from_path: "/a", to_path: "//evil.example" }),
    ).rejects.toThrow("site.redirect_invalid");
    expect(prisma.marketingRedirect.upsert).not.toHaveBeenCalled();
  });
});
