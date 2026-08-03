import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config.js", () => ({
  config: {
    frontend: { url: "https://water.moms.plus" },
    tenant: { baseDomain: "water.moms.plus" },
  },
}));

vi.mock("./prisma.js", () => ({
  prisma: {
    tenant: {
      findFirst: vi.fn(),
    },
  },
}));

import { ValidationError } from "./app-errors.js";
import {
  buildTenantDefaultUrl,
  extractTenantSubdomainLabel,
  getPlatformHostnames,
  hostnameFromUrl,
  normalizeCustomDomain,
  resolveHostTenant,
  resolveRequestHostname,
} from "./host-tenant.js";
import { prisma } from "./prisma.js";

describe("resolveRequestHostname", () => {
  it("优先 x-forwarded-host 并去掉端口", () => {
    expect(
      resolveRequestHostname({
        host: "ignored.example.com:3700",
        "x-forwarded-host": "Acme.Example.com:443",
      }),
    ).toBe("acme.example.com");
  });

  it("支持 IPv6 括号形式", () => {
    expect(resolveRequestHostname({ host: "[::1]:7300" })).toBe("::1");
  });
});

describe("hostnameFromUrl / getPlatformHostnames", () => {
  it("从 FRONTEND_URL 解析平台主域名", () => {
    expect(hostnameFromUrl("https://water.moms.plus/path")).toBe(
      "water.moms.plus",
    );
    expect(getPlatformHostnames().has("water.moms.plus")).toBe(true);
    expect(getPlatformHostnames().has("localhost")).toBe(true);
  });
});

describe("extractTenantSubdomainLabel / buildTenantDefaultUrl", () => {
  it("解析单标签子域", () => {
    expect(
      extractTenantSubdomainLabel("acme.water.moms.plus", "water.moms.plus"),
    ).toBe("acme");
  });

  it("拒绝基域本身、多级与保留前缀", () => {
    expect(
      extractTenantSubdomainLabel("water.moms.plus", "water.moms.plus"),
    ).toBeNull();
    expect(
      extractTenantSubdomainLabel("a.b.water.moms.plus", "water.moms.plus"),
    ).toBeNull();
    expect(
      extractTenantSubdomainLabel("www.water.moms.plus", "water.moms.plus"),
    ).toBeNull();
    expect(
      extractTenantSubdomainLabel("api.water.moms.plus", "water.moms.plus"),
    ).toBeNull();
  });

  it("拼默认访问 URL", () => {
    expect(buildTenantDefaultUrl("acme")).toBe("https://acme.water.moms.plus");
  });
});

describe("normalizeCustomDomain", () => {
  it("空值清除绑定", () => {
    expect(normalizeCustomDomain(null)).toBeNull();
    expect(normalizeCustomDomain("")).toBeNull();
    expect(normalizeCustomDomain("   ")).toBeNull();
  });

  it("规范化合法 hostname", () => {
    expect(normalizeCustomDomain("Portal.Acme.IO")).toBe("portal.acme.io");
  });

  it("拒绝 scheme / path / port / 通配符", () => {
    expect(() => normalizeCustomDomain("https://acme.com")).toThrow(
      ValidationError,
    );
    expect(() => normalizeCustomDomain("acme.com/path")).toThrow(
      ValidationError,
    );
    expect(() => normalizeCustomDomain("acme.com:443")).toThrow(
      ValidationError,
    );
    expect(() => normalizeCustomDomain("*.acme.com")).toThrow(ValidationError);
  });

  it("拒绝平台主域名与通配子域", () => {
    expect(() => normalizeCustomDomain("water.moms.plus")).toThrow(
      ValidationError,
    );
    expect(() => normalizeCustomDomain("acme.water.moms.plus")).toThrow(
      ValidationError,
    );
    expect(() => normalizeCustomDomain("localhost")).toThrow(ValidationError);
  });
});

describe("resolveHostTenant", () => {
  beforeEach(() => {
    vi.mocked(prisma.tenant.findFirst).mockReset();
  });

  it("平台主域名不查库", async () => {
    await expect(resolveHostTenant("water.moms.plus")).resolves.toBeNull();
    expect(prisma.tenant.findFirst).not.toHaveBeenCalled();
  });

  it("优先 custom_domain 精确匹配", async () => {
    vi.mocked(prisma.tenant.findFirst).mockResolvedValueOnce({
      id: "t-1",
      slug: "acme",
      name: "Acme",
    } as never);

    await expect(resolveHostTenant("portal.acme.io")).resolves.toEqual({
      tenant_id: "t-1",
      tenant_slug: "acme",
      name: "Acme",
    });
    expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
      where: { custom_domain: "portal.acme.io", status: "active" },
      select: { id: true, slug: true, name: true },
    });
  });

  it("按通配子域 slug 查找租户", async () => {
    vi.mocked(prisma.tenant.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "t-2",
        slug: "acme",
        name: "Acme",
      } as never);

    await expect(resolveHostTenant("acme.water.moms.plus")).resolves.toEqual({
      tenant_id: "t-2",
      tenant_slug: "acme",
      name: "Acme",
    });
    expect(prisma.tenant.findFirst).toHaveBeenNthCalledWith(2, {
      where: { slug: "acme", status: "active" },
      select: { id: true, slug: true, name: true },
    });
  });
});
