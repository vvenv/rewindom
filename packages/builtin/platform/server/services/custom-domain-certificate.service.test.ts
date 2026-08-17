import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ValidationError } from "@rewindom/server-kernel/lib/app-errors.js";

const getTenantById = vi.fn();
const config = {
  frontend: { url: "https://rewindom.com" },
  tenant: {
    acmeHelperUrl: "http://127.0.0.1:9370",
    acmeHelperToken: "secret",
    baseDomain: "rewindom.com",
  },
};

vi.mock("./tenant-management.service.js", () => ({
  getTenantById,
}));

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
  config,
}));

vi.mock("@rewindom/server-kernel/lib/host-tenant.js", async () => {
  const actual = await vi.importActual<
    typeof import("@rewindom/server-kernel/lib/host-tenant.js")
  >("@rewindom/server-kernel/lib/host-tenant.js");
  return {
    ...actual,
    getReservedHostnames: () => new Set(["rewindom.com", "admin.rewindom.com"]),
    hostnameFromUrl: actual.hostnameFromUrl,
  };
});

const { issueCustomDomainCertificate } = await import(
  "./custom-domain-certificate.service.js"
);

describe("issueCustomDomainCertificate", () => {
  const issueCertificate = vi.fn();
  const lookupIpv4 = vi.fn();
  const lookupIpv6 = vi.fn();
  const deps = { lookupIpv4, lookupIpv6, issueCertificate };

  beforeEach(() => {
    getTenantById.mockReset();
    issueCertificate.mockReset();
    lookupIpv4.mockReset();
    lookupIpv6.mockReset();
    lookupIpv6.mockResolvedValue([]);
    issueCertificate.mockResolvedValue(["yestino.com", "www.yestino.com"]);
    config.tenant.acmeHelperUrl = "http://127.0.0.1:9370";
    config.tenant.acmeHelperToken = "secret";
  });

  it("签发前要求已绑定自定义域名", async () => {
    getTenantById.mockResolvedValue({
      id: "t1",
      slug: "yestino",
      custom_domain: null,
    });
    await expect(issueCustomDomainCertificate("t1", deps)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(issueCertificate).not.toHaveBeenCalled();
  });

  it("helper 未配置时 503", async () => {
    getTenantById.mockResolvedValue({
      id: "t1",
      slug: "yestino",
      custom_domain: "yestino.com",
    });
    config.tenant.acmeHelperToken = "";
    await expect(issueCustomDomainCertificate("t1", deps)).rejects.toMatchObject({
      code: "platform.acme_helper_unconfigured",
      status: 503,
    } satisfies Partial<AppError>);
  });

  it("DNS 未指向平台时拒绝调用 helper", async () => {
    getTenantById.mockResolvedValue({
      id: "t1",
      slug: "yestino",
      custom_domain: "yestino.com",
    });
    lookupIpv4.mockImplementation(async (host: string) => {
      if (host === "rewindom.com") return ["64.90.15.63"];
      return ["1.2.3.4"];
    });
    await expect(issueCustomDomainCertificate("t1", deps)).rejects.toMatchObject({
      code: "platform.acme_dns_mismatch",
    });
    expect(issueCertificate).not.toHaveBeenCalled();
  });

  it("apex 与 www 都指向平台时一并签发", async () => {
    getTenantById.mockResolvedValue({
      id: "t1",
      slug: "yestino",
      custom_domain: "yestino.com",
    });
    lookupIpv4.mockResolvedValue(["64.90.15.63"]);
    await expect(issueCustomDomainCertificate("t1", deps)).resolves.toEqual({
      hostname: "yestino.com",
      names: ["yestino.com", "www.yestino.com"],
      slug: "yestino",
    });
    expect(issueCertificate).toHaveBeenCalledWith([
      "yestino.com",
      "www.yestino.com",
    ]);
  });

  it("www 未解析到平台时只签发 apex", async () => {
    getTenantById.mockResolvedValue({
      id: "t1",
      slug: "yestino",
      custom_domain: "yestino.com",
    });
    lookupIpv4.mockImplementation(async (host: string) => {
      if (host === "www.yestino.com") return [];
      return ["64.90.15.63"];
    });
    issueCertificate.mockResolvedValue(["yestino.com"]);
    await expect(issueCustomDomainCertificate("t1", deps)).resolves.toEqual({
      hostname: "yestino.com",
      names: ["yestino.com"],
      slug: "yestino",
    });
    expect(issueCertificate).toHaveBeenCalledWith(["yestino.com"]);
  });
});
