import { DEFAULT_TENANT_ID } from "@be-water/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * 与 `host-tenant.test.ts` 分成两个文件，就为了这里的 `isTest: false`：
 * 缓存在测试态是关掉的（同一文件里换了 prisma mock 还读到旧值会很难查），
 * 所以要验缓存本身，必须单独开一份把它打开的配置。
 */
vi.mock("./config.js", () => ({
  config: {
    frontend: { url: "https://moms.plus" },
    platform: { url: "https://platform.moms.plus" },
    tenant: { baseDomain: "moms.plus" },
    server: { isTest: false },
  },
}));

vi.mock("./prisma.js", () => ({
  prisma: {
    tenant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import {
  invalidateHostTenantCache,
  resolveHostTenant,
} from "./host-tenant.js";
import { prisma } from "./prisma.js";

const ACME = { id: "t-1", slug: "acme", name: "Acme" };

beforeEach(() => {
  vi.mocked(prisma.tenant.findFirst).mockReset();
  vi.mocked(prisma.tenant.findUnique).mockReset();
  invalidateHostTenantCache();
});

describe("resolveHostTenant 缓存", () => {
  /*
   * auth 中间件对每个 /api 请求都解析一次 Host。不缓存就等于给每个 API 调用
   * 附赠一次数据库往返——这是全站最热的路径。
   */
  it("同一个 Host 只查一次库", async () => {
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue(ACME as never);

    await expect(resolveHostTenant("portal.acme.io")).resolves.toMatchObject({
      tenant_id: "t-1",
    });
    await expect(resolveHostTenant("portal.acme.io")).resolves.toMatchObject({
      tenant_id: "t-1",
    });

    expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(1);
  });

  // 没绑定的 Host 更要缓存：否则随便刷一个不存在的域名就能压库
  it("「没有租户」这个结果同样进缓存", async () => {
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null as never);

    await expect(resolveHostTenant("nope.example")).resolves.toBeNull();
    await expect(resolveHostTenant("nope.example")).resolves.toBeNull();

    expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(1);
  });

  it("不同 Host 各自缓存，互不串味", async () => {
    vi.mocked(prisma.tenant.findFirst)
      .mockResolvedValueOnce(ACME as never)
      .mockResolvedValueOnce({ id: "t-2", slug: "beta", name: "Beta" } as never);

    await expect(resolveHostTenant("portal.acme.io")).resolves.toMatchObject({
      tenant_id: "t-1",
    });
    await expect(resolveHostTenant("portal.beta.io")).resolves.toMatchObject({
      tenant_id: "t-2",
    });
    // 再各来一次，都走缓存
    await expect(resolveHostTenant("portal.acme.io")).resolves.toMatchObject({
      tenant_id: "t-1",
    });
    await expect(resolveHostTenant("portal.beta.io")).resolves.toMatchObject({
      tenant_id: "t-2",
    });

    expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(2);
  });

  /*
   * 改绑定的写路径（建租户、改 slug / custom_domain、归档）必须调用它，
   * 否则新绑的域名会 404、刚归档的租户还进得去，最长持续一个 TTL。
   */
  it("invalidate 之后重新查库", async () => {
    vi.mocked(prisma.tenant.findFirst).mockResolvedValueOnce(null as never);
    await expect(resolveHostTenant("portal.acme.io")).resolves.toBeNull();

    vi.mocked(prisma.tenant.findFirst).mockResolvedValueOnce(ACME as never);
    // 没清缓存前还是旧结果
    await expect(resolveHostTenant("portal.acme.io")).resolves.toBeNull();

    invalidateHostTenantCache();
    await expect(resolveHostTenant("portal.acme.io")).resolves.toMatchObject({
      tenant_id: "t-1",
    });
    expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(2);
  });

  it("平台控制台 Host 依然不查库，也不占缓存", async () => {
    await expect(resolveHostTenant("platform.moms.plus")).resolves.toBeNull();
    await expect(resolveHostTenant("platform.moms.plus")).resolves.toBeNull();
    expect(prisma.tenant.findFirst).not.toHaveBeenCalled();
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it("产品主域的默认租户结果也缓存", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: DEFAULT_TENANT_ID,
      slug: "default",
      name: "默认租户",
      status: "active",
    } as never);

    await expect(resolveHostTenant("moms.plus")).resolves.toMatchObject({
      tenant_id: DEFAULT_TENANT_ID,
    });
    await expect(resolveHostTenant("moms.plus")).resolves.toMatchObject({
      tenant_id: DEFAULT_TENANT_ID,
    });

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
  });
});
