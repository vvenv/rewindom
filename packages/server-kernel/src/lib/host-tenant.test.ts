import { DEFAULT_TENANT_ID } from "@be-water/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config.js", () => ({
  config: {
    frontend: { url: "https://moms.plus" },
    platform: { url: "https://platform.moms.plus" },
    tenant: { baseDomain: "moms.plus" },
    // 测试态不缓存解析结果，这里逐条断言查库次数才有意义
    server: { isTest: true },
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

import { ValidationError } from "./app-errors.js";
import {
  extractTenantSubdomainLabel,
  getDefaultTenantHostnames,
  getPlatformConsoleHostnames,
  getReservedHostnames,
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

describe("hostname sets", () => {
  it("PLATFORM_URL 为平台控制台 Host", () => {
    expect(hostnameFromUrl("https://platform.moms.plus/path")).toBe(
      "platform.moms.plus",
    );
    expect(getPlatformConsoleHostnames().has("platform.moms.plus")).toBe(true);
    expect(getPlatformConsoleHostnames().has("localhost")).toBe(false);
  });

  it("FRONTEND_URL 为默认租户 Host（含 www）", () => {
    expect(getDefaultTenantHostnames().has("moms.plus")).toBe(true);
    expect(getDefaultTenantHostnames().has("www.moms.plus")).toBe(true);
    expect(getDefaultTenantHostnames().has("127.0.0.1")).toBe(false);
  });

  it("保留主机名包含两边", () => {
    expect(getReservedHostnames().has("moms.plus")).toBe(true);
    expect(getReservedHostnames().has("platform.moms.plus")).toBe(true);
  });
});

describe("extractTenantSubdomainLabel", () => {
  it("解析单标签子域", () => {
    expect(extractTenantSubdomainLabel("acme.moms.plus", "moms.plus")).toBe(
      "acme",
    );
  });

  it("拒绝基域本身、多级与保留前缀", () => {
    expect(extractTenantSubdomainLabel("moms.plus", "moms.plus")).toBeNull();
    expect(
      extractTenantSubdomainLabel("a.b.moms.plus", "moms.plus"),
    ).toBeNull();
    expect(
      extractTenantSubdomainLabel("www.moms.plus", "moms.plus"),
    ).toBeNull();
    expect(
      extractTenantSubdomainLabel("api.moms.plus", "moms.plus"),
    ).toBeNull();
  });

  /*
   * 本地多租户的做法（见 README / .env.example）：把基域设成 `localhost`，
   * 直接开 `{slug}.localhost:7300`——浏览器原生把 `*.localhost` 解析到回环，
   * 不用改 hosts，也不用给开发态另造一套「把当前 origin 绑到某租户」的旁路。
   * 这条断言就是那份文档的守卫：`localhost` 作基域必须照常解析。
   */
  it("localhost 可以当基域（本地多租户）", () => {
    expect(extractTenantSubdomainLabel("acme.localhost", "localhost")).toBe(
      "acme",
    );
    // 基域本身仍是产品站，不该被当成某个租户的子域
    expect(extractTenantSubdomainLabel("localhost", "localhost")).toBeNull();
    // 保留前缀照旧挡住，免得和 /app、/platform 这类入口撞名
    expect(
      extractTenantSubdomainLabel("app.localhost", "localhost"),
    ).toBeNull();
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

  it("拒绝产品主域、平台控制台 Host 与通配子域", () => {
    expect(() => normalizeCustomDomain("moms.plus")).toThrow(ValidationError);
    expect(() => normalizeCustomDomain("platform.moms.plus")).toThrow(
      ValidationError,
    );
    expect(() => normalizeCustomDomain("acme.moms.plus")).toThrow(
      ValidationError,
    );
  });
});

describe("resolveHostTenant", () => {
  beforeEach(() => {
    vi.mocked(prisma.tenant.findFirst).mockReset();
    vi.mocked(prisma.tenant.findUnique).mockReset();
  });

  it("平台控制台 Host 不查库", async () => {
    await expect(resolveHostTenant("platform.moms.plus")).resolves.toBeNull();
    expect(prisma.tenant.findFirst).not.toHaveBeenCalled();
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it("产品主域绑定默认租户", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      id: DEFAULT_TENANT_ID,
      slug: "default",
      name: "默认租户",
      status: "active",
    } as never);

    await expect(resolveHostTenant("moms.plus")).resolves.toEqual({
      tenant_id: DEFAULT_TENANT_ID,
      tenant_slug: "default",
      name: "默认租户",
    });
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: DEFAULT_TENANT_ID },
      select: { id: true, slug: true, name: true, status: true },
    });
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

    await expect(resolveHostTenant("acme.moms.plus")).resolves.toEqual({
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
