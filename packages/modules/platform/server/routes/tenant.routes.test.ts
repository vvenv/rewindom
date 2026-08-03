import "../test/platform.routes.test-mocks.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildApp,
  platformToken,
  prisma,
  resetPlatformRouteMocks,
  tenantToken,
} from "../test/platform.routes.test-shared.js";

describe("platform-tenant routes", () => {
  const mockTenant = {
    id: "t-1",
    slug: "acme",
    name: "Acme",
    remark: null,
    custom_domain: null as string | null,
    status: "active",
    plan: "starter" as const,
    plan_since: new Date(),
    plan_ends_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    resetPlatformRouteMocks();
    const { getTenantById } =
      await import("../services/tenant-management.service.js");
    vi.mocked(getTenantById).mockResolvedValue(mockTenant as never);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as never);
  });

  it("returns 403 for tenant JWT on platform routes", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/tenants",
      headers: { authorization: `Bearer ${tenantToken(app)}` },
    });
    expect(response.statusCode).toBe(403);
  });

  it("lists tenants for platform admin", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const { listTenants } =
      await import("../services/tenant-management.service.js");
    vi.mocked(listTenants).mockResolvedValueOnce([
      {
        id: "tenant-1",
        slug: "default",
        name: "默认租户",
        status: "active",
      },
    ] as never);
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      {
        id: "tenant-1",
        slug: "default",
        name: "默认租户",
        remark: null,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    ] as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/tenants",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
  });

  it("creates tenant", async () => {
    const { createTenant } =
      await import("../services/tenant-management.service.js");
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(createTenant).mockResolvedValueOnce({
      id: "tenant-2",
      slug: "acme",
      name: "Acme",
      status: "active",
      admin: {
        username: "admin",
        login_identifier: "admin@acme",
        password: "random12chars!",
      },
    } as never);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        tenant: {
          create: vi.fn().mockResolvedValue({
            id: "tenant-2",
            slug: "acme",
            name: "Acme",
            remark: null,
            status: "active",
            created_at: now,
            updated_at: now,
          }),
        },
        user: {
          create: vi.fn().mockResolvedValue({ id: "admin-user" }),
          upsert: vi.fn().mockResolvedValue({ id: "shadow-user" }),
        },
      } as never),
    );

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/tenants",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { slug: "acme", name: "Acme" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json().data;
    expect(body.slug).toBe("acme");
    expect(body.admin.username).toBe("admin");
    expect(body.admin.login_identifier).toBe("admin@acme");
    expect(body.admin.password).toHaveLength(14);
  });

  it("resets tenant admin password", async () => {
    const { resetTenantAdminPassword } =
      await import("../services/tenant-management.service.js");
    vi.mocked(resetTenantAdminPassword).mockResolvedValueOnce({
      password: "secret123",
      login_identifier: "admin@acme",
    } as never);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-2",
      slug: "acme",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-user",
      username: "admin",
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/tenants/tenant-2/admin/reset-password",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { new_password: "secret123" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.password).toBe("secret123");
    expect(response.json().data.login_identifier).toBe("admin@acme");
  });

  it("PATCH /tenants/:id 更新租户信息", async () => {
    const { patchTenant } =
      await import("../services/tenant-management.service.js");
    vi.mocked(patchTenant).mockResolvedValueOnce({
      ...mockTenant,
      slug: "new-slug",
      name: "New Name",
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "PATCH",
      url: "/api/platform/tenants/t-1",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { name: "New Name" },
    });

    expect(response.statusCode).toBe(200);
    expect(patchTenant).toHaveBeenCalledWith("t-1", { name: "New Name" });
    expect(response.json().data.name).toBe("New Name");
  });

  it("PATCH /tenants/:id 租户不存在返回 404", async () => {
    const { getTenantById } =
      await import("../services/tenant-management.service.js");
    vi.mocked(getTenantById).mockResolvedValueOnce(null);

    const app = await buildApp();
    const response = await app.inject({
      method: "PATCH",
      url: "/api/platform/tenants/nonexistent",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { name: "New" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("PATCH /tenants/:id 无更新字段返回 400", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "PATCH",
      url: "/api/platform/tenants/t-1",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("POST /tenants/:id/archive 归档租户成功", async () => {
    const { archiveTenant } =
      await import("../services/tenant-management.service.js");
    vi.mocked(archiveTenant).mockResolvedValueOnce({
      ...mockTenant,
      status: "archived",
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/tenants/t-1/archive",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe("archived");
  });

  it("POST /tenants/:id/archive 默认租户不可归档", async () => {
    const { getTenantById } =
      await import("../services/tenant-management.service.js");
    vi.mocked(getTenantById).mockResolvedValueOnce({
      ...mockTenant,
      id: "t-default",
      slug: "default",
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/tenants/t-default/archive",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it("POST /tenants/:id/archive 已归档租户返回 400", async () => {
    const { getTenantById } =
      await import("../services/tenant-management.service.js");
    vi.mocked(getTenantById).mockResolvedValueOnce({
      ...mockTenant,
      status: "archived",
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/tenants/t-1/archive",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it("POST /tenants/:id/impersonate 代登录成功", async () => {
    const { impersonateTenantAdmin } =
      await import("../services/tenant-management.service.js");
    vi.mocked(impersonateTenantAdmin).mockResolvedValueOnce({
      access_token: "new-token",
      login_identifier: "admin@acme",
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/tenants/t-1/impersonate",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.access_token).toBe("new-token");
  });

  it("POST /tenants/:id/impersonate 租户不存在返回 404", async () => {
    const { getTenantById } =
      await import("../services/tenant-management.service.js");
    vi.mocked(getTenantById).mockResolvedValueOnce(null);

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/tenants/nonexistent/impersonate",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("GET /tenants/:id/stats 返回租户统计", async () => {
    const { getTenantStats } =
      await import("../services/tenant-management.service.js");
    vi.mocked(getTenantStats).mockResolvedValueOnce({
      document_count: 30,
      product_count: 50,
      analysis_count: 12,
      user_count: 10,
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/tenants/t-1/stats",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.document_count).toBe(30);
  });

  it("GET /tenants/:id/stats 租户不存在返回 404", async () => {
    const { getTenantStats } =
      await import("../services/tenant-management.service.js");
    vi.mocked(getTenantStats).mockResolvedValueOnce(null);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/tenants/nonexistent/stats",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("GET /tenants/:id/integration-status 返回集成状态", async () => {
    const { getTenantIntegrationStatus } =
      await import("../services/tenant-management.service.js");
    vi.mocked(getTenantIntegrationStatus).mockResolvedValueOnce({
      openai_api: {
        configured: true,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/tenants/t-1/integration-status",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.openai_api.configured).toBe(true);
  });

  it("GET /tenants/:id/features 返回功能开关", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/tenants/t-1/features",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.features).toBeDefined();
    expect(response.json().data.modules).toBeDefined();
  });

  it("PUT /tenants/:id/features 更新功能开关", async () => {
    const { saveTenantFeatureFlags: saveFlags } =
      await import("../services/tenant-feature.service.js");
    vi.mocked(saveFlags).mockResolvedValueOnce({
      advanced_analysis: true,
      vector_search: true,
      bulk_import: false,
      api_access: false,
      custom_reports: false,
      advanced_retrieval: false,
      chat: true,
    });
    const { getTenantEntitlements } =
      await import("../services/tenant-entitlement.service.js");
    vi.mocked(getTenantEntitlements).mockResolvedValueOnce({
      modules: { chat: true },
      features: {
        advanced_analysis: true,
        vector_search: true,
        bulk_import: false,
        api_access: false,
        custom_reports: false,
        advanced_retrieval: false,
        chat: true,
      },
    });

    const app = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/platform/tenants/t-1/features",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { features: { advanced_analysis: true } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.features.advanced_analysis).toBe(true);
  });

  it("PUT /tenants/:id/plan 更新租户套餐", async () => {
    const { updateTenantPlan } =
      await import("../services/tenant-management.service.js");
    vi.mocked(updateTenantPlan).mockResolvedValueOnce({
      ...mockTenant,
      plan: "pro",
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/platform/tenants/t-1/plan",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { plan: "pro" },
    });

    expect(response.statusCode).toBe(200);
    expect(updateTenantPlan).toHaveBeenCalledWith("t-1", { plan: "pro" });
    expect(response.json().data.plan).toBe("pro");
  });

  it("PUT /tenants/:id/plan 缺少参数返回 400", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/platform/tenants/t-1/plan",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("GET /tenants include_archived=true 包含已归档租户", async () => {
    const { listTenants } =
      await import("../services/tenant-management.service.js");
    vi.mocked(listTenants).mockResolvedValueOnce([
      { id: "t-1", slug: "acme", status: "archived" },
    ] as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/tenants?include_archived=true",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(listTenants).toHaveBeenCalledWith({ include_archived: true });
  });
});
