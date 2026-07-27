import { AuthService } from "@be-water/server-kernel/kernel/auth/auth.service.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@be-water/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    tenant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: "admin-user" }),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    },
    auditLog: {
      updateMany: vi.fn(),
    },
    errorLog: {
      updateMany: vi.fn(),
    },
    store: { count: vi.fn() },
    order: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@be-water/server-kernel/kernel/auth/auth.service.js", () => ({
  AuthService: {
    hashPassword: vi.fn(),
    revokeAllUserTokens: vi.fn(),
    generateTokens: vi.fn(),
  },
}));

vi.mock("./ensure-tenant-impersonation-user.service.js", () => ({
  ensureTenantImpersonationUser: vi.fn(),
  excludeInternalUsersWhere: {
    id: { not: "00000000-0000-0000-0000-000000000000" },
    username: { not: "__support_impersonation__" },
  },
}));

import { ensureTenantImpersonationUser } from "./ensure-tenant-impersonation-user.service.js";
import {
  createTenant,
  impersonateTenantAdmin,
  listTenants,
  patchTenant,
  resetTenantAdminPassword,
} from "./tenant-management.service.js";

describe("tenant-management.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists tenants", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      {
        id: DEFAULT_TENANT_ID,
        slug: "default",
        name: "默认租户",
        remark: null,
        status: "active",
        plan: "free",
        plan_since: null,
        plan_ends_at: null,
        created_at: now,
        updated_at: now,
      },
    ] as never);

    const tenants = await listTenants();
    expect(tenants).toHaveLength(1);
    expect(tenants[0]?.slug).toBe("default");
  });

  it("creates tenant with normalized slug and initial admin", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);
    vi.mocked(AuthService.hashPassword).mockResolvedValue("hashed_password");
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        tenant: {
          create: vi.fn().mockResolvedValue({
            id: "tenant-2",
            slug: "acme",
            name: "Acme Inc",
            remark: "VIP 客户",
            status: "active",
            created_at: now,
            updated_at: now,
          }),
        },
        user: {
          create: vi.fn().mockResolvedValue({ id: "admin-user" }),
        },
      } as never),
    );

    const tenant = await createTenant({
      slug: "Acme",
      name: "Acme Inc",
      remark: " VIP 客户 ",
    });
    expect(tenant.slug).toBe("acme");
    expect(tenant.remark).toBe("VIP 客户");
    expect(tenant.admin.username).toBe("admin");
    expect(tenant.admin.login_identifier).toBe("admin@acme");
    expect(tenant.admin.password).toHaveLength(12);
    expect(AuthService.hashPassword).toHaveBeenCalledWith(
      tenant.admin.password,
    );
    expect(ensureTenantImpersonationUser).toHaveBeenCalledWith(
      "tenant-2",
      expect.anything(),
    );
  });

  it("resets tenant admin password", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-2",
      slug: "acme",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-user",
      username: "admin",
    } as never);
    vi.mocked(AuthService.hashPassword).mockResolvedValue("hashed_password");
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(AuthService.revokeAllUserTokens).mockResolvedValue();

    const credentials = await resetTenantAdminPassword(
      "tenant-2",
      "newpass123",
    );
    expect(credentials.password).toBe("newpass123");
    expect(credentials.login_identifier).toBe("admin@acme");
    expect(credentials.recreated).toBe(false);
    expect(prisma.user.update).toHaveBeenCalled();
    expect(AuthService.revokeAllUserTokens).toHaveBeenCalledWith("admin-user");
  });

  it("recreates tenant admin when missing", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-2",
      slug: "acme",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(AuthService.hashPassword).mockResolvedValue("hashed_password");

    const credentials = await resetTenantAdminPassword("tenant-2");
    expect(credentials.recreated).toBe(true);
    expect(credentials.login_identifier).toBe("admin@acme");
    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(AuthService.revokeAllUserTokens).not.toHaveBeenCalled();
  });

  it("rejects suspending default tenant", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: DEFAULT_TENANT_ID,
      slug: "default",
      name: "默认租户",
      remark: null,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    } as never);

    await expect(
      patchTenant(DEFAULT_TENANT_ID, { status: "suspended" }),
    ).rejects.toThrow("默认租户不可暂停");
  });

  it("patches tenant slug and syncs denormalized tenant_slug fields", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-2",
      slug: "acme",
      name: "Acme Inc",
      remark: null,
      status: "active",
      created_at: now,
      updated_at: now,
    } as never);
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        tenant: {
          update: vi.fn().mockResolvedValue({
            id: "tenant-2",
            slug: "acme-corp",
            name: "Acme Inc",
            remark: null,
            status: "active",
            created_at: now,
            updated_at: now,
          }),
        },
        auditLog: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        errorLog: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      } as never),
    );

    const tenant = await patchTenant("tenant-2", { slug: "Acme-Corp" });
    expect(tenant.slug).toBe("acme-corp");
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("rejects changing default tenant slug", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: DEFAULT_TENANT_ID,
      slug: "default",
      name: "默认租户",
      remark: null,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    } as never);

    await expect(
      patchTenant(DEFAULT_TENANT_ID, { slug: "new-default" }),
    ).rejects.toThrow("默认租户标识不可修改");
  });

  it("patches tenant remark", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-2",
      slug: "acme",
      name: "Acme Inc",
      remark: null,
      status: "active",
      created_at: now,
      updated_at: now,
    } as never);
    vi.mocked(prisma.tenant.update).mockResolvedValue({
      id: "tenant-2",
      slug: "acme",
      name: "Acme Inc",
      remark: "新备注",
      status: "active",
      created_at: now,
      updated_at: now,
    } as never);

    const tenant = await patchTenant("tenant-2", { remark: "新备注" });
    expect(tenant.remark).toBe("新备注");
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-2" },
      data: { remark: "新备注" },
    });
  });

  it("impersonates selected tenant user", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-2",
      slug: "acme",
      name: "Acme Inc",
      status: "active",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-user",
      username: "admin",
      is_system_admin: true,
      enabled: true,
      password: "hashed",
      tenant_id: "tenant-2",
      created_at: now,
      updated_at: now,
      last_login_at: null,
      failed_login_attempts: 0,
      locked_until: null,
    } as never);
    vi.mocked(AuthService.generateTokens).mockReturnValue({
      accessToken: "access",
      refreshToken: "refresh",
    });
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);

    const jwtSign = vi.fn();
    const result = await impersonateTenantAdmin(
      "tenant-2",
      jwtSign,
      "admin-user",
    );

    expect(ensureTenantImpersonationUser).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "admin-user" },
    });
    expect(AuthService.generateTokens).toHaveBeenCalledWith(
      "admin-user",
      "tenant_user",
      true,
      "tenant-2",
      "acme",
      jwtSign,
    );
    expect(result.login_identifier).toBe("admin@acme");
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });
});
