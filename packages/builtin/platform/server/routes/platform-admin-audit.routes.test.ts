import "../test/platform.routes.test-mocks.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuditAction, AuditScope } from "../../../audit/shared/index.js";
import {
  buildApp,
  platformToken,
  resetPlatformRouteMocks,
} from "../test/platform.routes.test-shared.js";

const auditEmit = vi.hoisted(() => ({
  emitAuditLogFromRequestSafe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(
  "@rewindom/server-kernel/runtime/audit-log-emit.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@rewindom/server-kernel/runtime/audit-log-emit.js")
    >()),
    emitAuditLogFromRequestSafe: auditEmit.emitAuditLogFromRequestSafe,
  }),
);

vi.mock("../../../rbac/server/role.service.js", () => ({
  RoleService: {
    listPlatformRoles: vi.fn().mockResolvedValue([]),
    createPlatformRole: vi.fn(),
    updatePlatformRole: vi.fn(),
    deletePlatformRole: vi.fn(),
  },
}));

vi.mock("../services/platform-admin-management.service.js", () => ({
  PlatformAdminManagementService: {
    createAdmin: vi.fn(),
  },
}));

const platformRoleDto = {
  id: "role-1",
  name: "运维",
  description: null,
  scope: "platform" as const,
  is_builtin: false,
  permissions: ["platform.admins.read"],
  created_at: new Date(),
  updated_at: new Date(),
};

/** 取本次请求写出的审计入参（emitAuditLogFromRequestSafe 的第 4 个参数）。 */
function lastAuditInput() {
  const calls = auditEmit.emitAuditLogFromRequestSafe.mock.calls;
  expect(calls.length).toBe(1);
  return calls[0][3] as { action: string; scope?: string; resource: string };
}

describe("平台角色写操作的审计日志", () => {
  beforeEach(() => {
    resetPlatformRouteMocks();
    auditEmit.emitAuditLogFromRequestSafe.mockClear();
  });

  it("创建平台角色写入 ROLE_CREATE，且落在 platform scope", async () => {
    const { RoleService } =
      await import("../../../rbac/server/role.service.js");
    vi.mocked(RoleService.createPlatformRole).mockResolvedValue(
      platformRoleDto,
    );

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/roles",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { name: "运维", permissions: ["platform.admins.read"] },
    });

    expect(response.statusCode).toBe(201);
    expect(lastAuditInput()).toMatchObject({
      action: AuditAction.ROLE_CREATE,
      scope: AuditScope.PLATFORM,
      resource: "platform_role:运维",
    });
  });

  it("更新平台角色写入 ROLE_UPDATE", async () => {
    const { RoleService } =
      await import("../../../rbac/server/role.service.js");
    vi.mocked(RoleService.updatePlatformRole).mockResolvedValue(
      platformRoleDto,
    );

    const app = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/platform/roles/role-1",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { permissions: ["platform.admins.read"] },
    });

    expect(response.statusCode).toBe(200);
    expect(lastAuditInput()).toMatchObject({
      action: AuditAction.ROLE_UPDATE,
      scope: AuditScope.PLATFORM,
    });
  });

  it("删除平台角色写入 ROLE_DELETE，并带上已删除角色名", async () => {
    const { RoleService } =
      await import("../../../rbac/server/role.service.js");
    vi.mocked(RoleService.deletePlatformRole).mockResolvedValue("运维");

    const app = await buildApp();
    const response = await app.inject({
      method: "DELETE",
      url: "/api/platform/roles/role-1",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(lastAuditInput()).toMatchObject({
      action: AuditAction.ROLE_DELETE,
      scope: AuditScope.PLATFORM,
      resource: "platform_role:运维",
    });
  });

  // 平台控制台的动作若落成 tenant scope 且 tenant_slug 为空，
  // 会被 default 租户的审计台当作自己的记录读到——这会捅穿租户隔离。
  it("平台管理员管理动作标记为 platform scope，不泄漏进租户审计台", async () => {
    const { PlatformAdminManagementService } =
      await import("../services/platform-admin-management.service.js");
    vi.mocked(PlatformAdminManagementService.createAdmin).mockResolvedValue({
      id: "admin-2",
      username: "ops",
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/admins",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { username: "ops", password: "password123" },
    });

    expect(response.statusCode).toBe(201);
    expect(lastAuditInput()).toMatchObject({
      action: AuditAction.USER_CREATE,
      scope: AuditScope.PLATFORM,
      resource: "platform_admin:ops",
    });
  });

  it("角色删除失败时不写审计", async () => {
    const { RoleService } =
      await import("../../../rbac/server/role.service.js");
    vi.mocked(RoleService.deletePlatformRole).mockRejectedValue(
      new Error("内置角色不可删除"),
    );

    const app = await buildApp();
    const response = await app.inject({
      method: "DELETE",
      url: "/api/platform/roles/role-builtin",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(400);
    expect(auditEmit.emitAuditLogFromRequestSafe).not.toHaveBeenCalled();
  });
});
