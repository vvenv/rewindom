import FastifyJWT from "@fastify/jwt";
import { ProviderRegistry } from "@be-water/server-kernel/runtime/provider-registry.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { authMiddleware } from "@be-water/server-kernel/middleware/auth.middleware.js";
import { installTestPermissionCatalog } from "@be-water/server-test/permission-catalog";
import {
  DEFAULT_TENANT_ID,
  PLATFORM_ADMIN_USER_ID,
} from "@be-water/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { vi } from "vitest";

import {
  PbacAuthzProvider,
  permissionMiddleware,
} from "../../../rbac/server/permission.middleware.js";
import { platformRoutes } from "../platform.routes.js";

export type PlatformTestApp = FastifyInstance;

installTestPermissionCatalog([
  { key: "platform.roles.read", label: "查看平台角色", group: "平台权限" },
  { key: "platform.roles.write", label: "编辑平台角色", group: "平台权限" },
  { key: "platform.roles.assign", label: "分配平台角色", group: "平台权限" },
  { key: "platform.admins.read", label: "查看平台管理员", group: "平台权限" },
  { key: "platform.admins.write", label: "编辑平台管理员", group: "平台权限" },
]);

export async function buildApp(): Promise<PlatformTestApp> {
  const app = Fastify({ logger: false });
  await app.register(FastifyJWT, { secret: "test-secret" });
  await authMiddleware(app);
  const registry = new ProviderRegistry();
  registry.setAuthzProvider(new PbacAuthzProvider(app));
  await permissionMiddleware(app, registry);
  await app.register(platformRoutes, { prefix: "/api/platform" });
  return app;
}

export function platformToken(app: PlatformTestApp): string {
  return app.jwt.sign({
    userId: PLATFORM_ADMIN_USER_ID,
    actor_type: "platform_admin",
    is_system_admin: true,
    type: "access",
  });
}

export function tenantToken(app: PlatformTestApp): string {
  return app.jwt.sign({
    userId: "user-1",
    actor_type: "tenant_user",
    is_system_admin: true,
    tenant_id: DEFAULT_TENANT_ID,
    tenant_slug: "default",
    type: "access",
  });
}

export function resetPlatformRouteMocks(): void {
  vi.clearAllMocks();
  vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue({
    id: PLATFORM_ADMIN_USER_ID,
    username: "platform",
    enabled: true,
    is_system_admin: true,
    last_access_at: null,
  } as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    username: "admin",
    tenant_id: DEFAULT_TENANT_ID,
    is_system_admin: true,
    last_access_at: null,
  } as never);
  vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
    status: "active",
  } as never);
}

export { prisma };
