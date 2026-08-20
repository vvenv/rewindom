import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { resolveSiteAccountEntry } from "../../marketing/server/site-account-entry.js";
import { getPageTemplateKind } from "../../marketing/shared/page-templates.js";
import { MEMBER_ACCOUNT_PAGE_KIND } from "../shared/member-account-section.js";
import {
  MEMBER_LOGIN_PAGE_KIND,
  MEMBER_REGISTER_PAGE_KIND,
} from "../shared/member-auth-section.js";
import { registerMemberPageTemplates } from "../shared/member-page-templates.js";

import { registerSiteMemberAccountEntry } from "./site-account-entry.js";
import {
  isSiteMemberEnabledForHost,
  resolveSiteTenant,
} from "./site-member-tenant.js";

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: { tenant: { findUnique: vi.fn() } },
}));

vi.mock("../../platform/server/services/tenant-module.service.js", () => ({
  isTenantModuleEnabled: vi.fn(),
}));

const hostTenant = { tenant_id: "tenant-1", tenant_slug: "acme" } as never;

describe("会员开关", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-1",
      slug: "acme",
      status: "active",
    } as never);
  });

  it("开着就正常解析出站点", async () => {
    vi.mocked(isTenantModuleEnabled).mockResolvedValue(true);

    await expect(resolveSiteTenant(hostTenant)).resolves.toEqual({
      id: "tenant-1",
      slug: "acme",
    });
    await expect(isSiteMemberEnabledForHost(hostTenant)).resolves.toBe(true);
  });

  it("关掉后公开会员接口一律不可用", async () => {
    vi.mocked(isTenantModuleEnabled).mockResolvedValue(false);

    await expect(resolveSiteTenant(hostTenant)).rejects.toMatchObject({
      code: "site_member.not_enabled",
      status: 403,
    });
    await expect(isSiteMemberEnabledForHost(hostTenant)).resolves.toBe(false);
  });

  it("关掉后页头不画账户入口", async () => {
    registerSiteMemberAccountEntry();
    vi.mocked(isTenantModuleEnabled).mockResolvedValue(false);

    await expect(
      resolveSiteAccountEntry({ tenantId: "tenant-1", locale: "zh-CN" }),
    ).resolves.toEqual({ available: false, html: "" });
  });

  it("Host 没绑站点就没有会员入口（不抛错）", async () => {
    await expect(isSiteMemberEnabledForHost(null)).resolves.toBe(false);
    expect(isTenantModuleEnabled).not.toHaveBeenCalled();
  });
});

describe("会员模板页", () => {
  it("三张都挂在会员开关下，且不预建", () => {
    registerMemberPageTemplates();
    for (const kind of [
      MEMBER_LOGIN_PAGE_KIND,
      MEMBER_REGISTER_PAGE_KIND,
      MEMBER_ACCOUNT_PAGE_KIND,
    ]) {
      const template = getPageTemplateKind(kind);
      expect(template?.entitlement).toBe("site-member");
      expect(template?.auto_init).toBe(false);
    }
  });
});
