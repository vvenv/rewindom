import { randomUUID } from "node:crypto";

import FastifyJWT from "@fastify/jwt";
import {
  invalidatePlatformAdminPermissionCache,
  invalidateUserPermissionCache,
  PbacAuthzProvider,
  permissionMiddleware,
} from "@be-water/modules/rbac/server/permission.middleware.js";
import { authMiddleware } from "@be-water/server-kernel/middleware/auth.middleware.js";
import { errorHandlerMiddleware } from "@be-water/server-kernel/middleware/error-handler.middleware.js";
import { ProviderRegistry } from "@be-water/server-kernel/runtime/provider-registry.js";
import { AuthService } from "@be-water/server-kernel/kernel/auth/auth.service.js";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_SLUG,
  platformAdminPermissionCacheKey,
  userPermissionCacheKey,
  type AuthActorType,
} from "@be-water/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { vi } from "vitest";

import { prismaMock } from "./register-prisma-mock.js";

vi.mock("@be-water/server-kernel/lib/config.js", () => ({
  config: {
    auth: {
      jwtSecret: "test-secret",
      bcryptSaltRounds: 4,
      platformAdmin: {
        username: "platform",
        password: "",
        passwordHash: "",
      },
      github: {
        clientId: "",
        clientSecret: "",
        callbackUrl: "",
        enabled: false,
      },
      google: {
        clientId: "",
        clientSecret: "",
        callbackUrl: "",
        enabled: false,
      },
    },
    frontend: {
      url: "http://localhost:7300",
    },
    server: {
      isProduction: false,
      isTest: true,
      logLevel: "silent",
    },
    database: {
      restore: {
        maxUploadFileBytes: 10 * 1024 * 1024 * 1024,
        parallelJobs: 4,
        localPaths: ["/backups"],
      },
      backup: {
        pgDumpCompressLevel: 6,
      },
    },
    storage: {
      export: {
        databaseBackup: {
          dir: "/tmp/backups",
        },
      },
      attachment: {
        storage: "local",
        baseDir: "/tmp/attachments",
      },
    },
    observability: {
      errorLog: {
        enabled: false,
        includeRequestBody: false,
        includeRequestParams: false,
        includeRequestQuery: false,
      },
      slowQuery: {
        retentionDays: 30,
      },
    },
    infra: {
      redis: {
        host: "",
        port: 6379,
        password: null,
        db: 0,
      },
    },
    tenant: {
      secretEncryptionKey: Buffer.alloc(32, 0),
    },
  },
}));

export type TestApp = FastifyInstance;

export interface TestUser {
  id: string;
  username: string;
  actor_type: AuthActorType;
  is_system_admin: boolean;
  tenant_id: string;
  tenant_slug: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

export interface RouteTestAppOptions {
  skipPermission?: boolean;
  skipErrorHandler?: boolean;
}

export interface CreateTestUserOptions {
  is_system_admin?: boolean;
  tenantId?: string;
  tenantSlug?: string;
}

export interface CreateTestPlatformAdminOptions {
  is_system_admin?: boolean;
  adminId?: string;
}

interface StoredTestUser {
  id: string;
  username: string;
  password_hash: string;
  is_system_admin: boolean;
  tenant_id: string;
  enabled: boolean;
}

interface StoredPlatformAdmin {
  id: string;
  username: string;
  password_hash: string;
  is_system_admin: boolean;
  enabled: boolean;
}

const usersById = new Map<string, StoredTestUser>();
const usersByUsernameKey = new Map<string, StoredTestUser>();
const permissionsByUserId = new Map<string, Set<string>>();

const platformAdminsById = new Map<string, StoredPlatformAdmin>();
const platformPermissionsByAdminId = new Map<string, Set<string>>();

function usernameKey(tenantId: string, username: string): string {
  return `${tenantId}:${username}`;
}

function findStoredUser(where: {
  id?: string;
  username_tenant_id?: { username: string; tenant_id: string };
}): StoredTestUser | null {
  if (where.id) {
    return usersById.get(where.id) ?? null;
  }
  if (where.username_tenant_id) {
    const key = usernameKey(
      where.username_tenant_id.tenant_id,
      where.username_tenant_id.username,
    );
    return usersByUsernameKey.get(key) ?? null;
  }
  return null;
}

function findStoredUserWithTenantScope(where: {
  id?: string;
  tenant_id?: string;
}): StoredTestUser | null {
  if (!where.id) {
    return null;
  }
  const user = usersById.get(where.id);
  if (!user) {
    return null;
  }
  if (where.tenant_id && user.tenant_id !== where.tenant_id) {
    return null;
  }
  return user;
}

function buildRolePermissionRows(permissions: Set<string> | undefined) {
  if (!permissions || permissions.size === 0) {
    return [];
  }
  return [
    {
      role: {
        scope: "tenant",
        role_permissions: [...permissions].map((permission) => ({ permission })),
      },
    },
  ];
}

function buildPlatformRolePermissionRows(permissions: Set<string> | undefined) {
  if (!permissions || permissions.size === 0) {
    return [];
  }
  return [
    {
      role: {
        scope: "platform",
        role_permissions: [...permissions].map((permission) => ({ permission })),
      },
    },
  ];
}

export function installAuthUserFindUniqueMock(): void {
  vi.mocked(prismaMock.user.findUnique).mockImplementation(
    async ({ where }) => {
      const user = findStoredUser(where as never);
      if (!user) {
        return null;
      }
      return {
        id: user.id,
        username: user.username,
        tenant_id: user.tenant_id,
        is_system_admin: user.is_system_admin,
        enabled: user.enabled,
        password_hash: user.password_hash,
        last_access_at: null,
      } as never;
    },
  );

  vi.mocked(prismaMock.user.findFirst).mockImplementation(async ({ where }) => {
    const user = findStoredUserWithTenantScope(where as never);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      username: user.username,
      tenant_id: user.tenant_id,
      is_system_admin: user.is_system_admin,
      enabled: user.enabled,
      password_hash: user.password_hash,
      last_access_at: null,
    } as never;
  });

  vi.mocked(prismaMock.platformAdmin.findUnique).mockImplementation(
    async ({ where }) => {
      const id = (where as { id: string }).id;
      const admin = platformAdminsById.get(id);
      if (!admin) {
        return null;
      }
      return {
        id,
        username: admin.username,
        enabled: admin.enabled,
        is_system_admin: admin.is_system_admin,
        last_access_at: null,
      } as never;
    },
  );

  vi.mocked(prismaMock.userRole.findMany).mockImplementation(
    async ({ where }) => {
      const userId = (where as { user_id: string }).user_id;
      return buildRolePermissionRows(permissionsByUserId.get(userId)) as never;
    },
  );

  vi.mocked(prismaMock.platformAdminRole.findMany).mockImplementation(
    async ({ where }) => {
      const adminId = (where as { admin_id: string }).admin_id;
      return buildPlatformRolePermissionRows(
        platformPermissionsByAdminId.get(adminId),
      ) as never;
    },
  );

  vi.mocked(prismaMock.tenant.findUnique).mockImplementation(
    async ({ where }) => {
      const id = (where as { id?: string }).id;
      if (id === DEFAULT_TENANT_ID) {
        return {
          id: DEFAULT_TENANT_ID,
          slug: DEFAULT_TENANT_SLUG,
          status: "active",
          plan: "free",
        } as never;
      }
      return {
        id,
        slug: "test-tenant",
        status: "active",
        plan: "free",
      } as never;
    },
  );

  vi.mocked(prismaMock.user.delete).mockImplementation(async ({ where }) => {
    const user = findStoredUser(where as never);
    if (user) {
      usersById.delete(user.id);
      usersByUsernameKey.delete(usernameKey(user.tenant_id, user.username));
      permissionsByUserId.delete(user.id);
    }
    return user as never;
  });

  vi.mocked(prismaMock.user.update).mockResolvedValue({} as never);
  vi.mocked(prismaMock.platformAdmin.update).mockResolvedValue({} as never);
}

export function mockUserFindUnique(user: {
  id: string;
  username: string;
  tenant_id: string;
}): void {
  vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce({
    username: user.username,
    tenant_id: user.tenant_id,
  } as never);
}

export function mockAssigneeUserFindUnique(
  users: Array<{ id: string; username: string; tenant_id: string }>,
): void {
  for (const user of users) {
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce({
      id: user.id,
      username: user.username,
      tenant_id: user.tenant_id,
    } as never);
  }
}

async function buildBaseTestApp(
  register: (app: FastifyInstance) => Promise<void>,
  options: RouteTestAppOptions = {},
): Promise<TestApp> {
  const app = Fastify({ logger: false });
  app.decorate("prisma", prismaMock as unknown as TestApp["prisma"]);
  await app.register(FastifyJWT, { secret: "test-secret" });
  await authMiddleware(app);
  if (!options.skipPermission) {
    const registry = new ProviderRegistry();
    registry.setAuthzProvider(new PbacAuthzProvider(app));
    await permissionMiddleware(app, registry);
  }
  await register(app);
  if (!options.skipErrorHandler) {
    await errorHandlerMiddleware(app);
  }
  installAuthUserFindUniqueMock();
  return app;
}

export async function createRouteTestApp(
  register: (app: FastifyInstance) => Promise<void>,
  options?: RouteTestAppOptions,
): Promise<TestApp> {
  return buildBaseTestApp(register, options);
}

export async function createTestUser(
  app: TestApp,
  username: string,
  password: string,
  options: CreateTestUserOptions = {},
): Promise<TestUser> {
  return createTestUserFast(app, username, password, options);
}

export async function createTestUserFast(
  app: TestApp,
  username: string,
  password: string,
  options: CreateTestUserOptions = {},
): Promise<TestUser> {
  const tenantId = options.tenantId ?? DEFAULT_TENANT_ID;
  const tenantSlug = options.tenantSlug ?? DEFAULT_TENANT_SLUG;
  const is_system_admin = options.is_system_admin ?? false;
  const id = randomUUID();
  const password_hash = await AuthService.hashPassword(password);
  const stored: StoredTestUser = {
    id,
    username,
    password_hash,
    is_system_admin,
    tenant_id: tenantId,
    enabled: true,
  };
  usersById.set(id, stored);
  usersByUsernameKey.set(usernameKey(tenantId, username), stored);
  permissionsByUserId.set(id, new Set());

  const accessToken = app.jwt.sign({
    userId: id,
    actor_type: "tenant_user",
    is_system_admin,
    tenant_id: tenantId,
    tenant_slug: tenantSlug,
    type: "access",
  });
  const refreshToken = app.jwt.sign({
    userId: id,
    actor_type: "tenant_user",
    is_system_admin,
    tenant_id: tenantId,
    tenant_slug: tenantSlug,
    type: "refresh",
  });

  return {
    id,
    username,
    actor_type: "tenant_user",
    is_system_admin,
    tenant_id: tenantId,
    tenant_slug: tenantSlug,
    password,
    accessToken,
    refreshToken,
  };
}

export async function createTestPlatformAdminFast(
  app: TestApp,
  username: string,
  password: string,
  options: CreateTestPlatformAdminOptions = {},
): Promise<TestUser> {
  const is_system_admin = options.is_system_admin ?? false;
  const id = options.adminId ?? randomUUID();
  const password_hash = await AuthService.hashPassword(password);
  const stored: StoredPlatformAdmin = {
    id,
    username,
    password_hash,
    is_system_admin,
    enabled: true,
  };
  platformAdminsById.set(id, stored);
  platformPermissionsByAdminId.set(id, new Set());

  const accessToken = app.jwt.sign({
    userId: id,
    actor_type: "platform_admin",
    is_system_admin,
    type: "access",
  });
  const refreshToken = app.jwt.sign({
    userId: id,
    actor_type: "platform_admin",
    is_system_admin,
    type: "refresh",
  });

  return {
    id,
    username,
    actor_type: "platform_admin",
    is_system_admin,
    tenant_id: "",
    tenant_slug: "",
    password,
    accessToken,
    refreshToken,
  };
}

export async function cleanupTestUser(
  _app: TestApp,
  userId: string,
): Promise<void> {
  const user = usersById.get(userId);
  if (user) {
    usersById.delete(userId);
    usersByUsernameKey.delete(usernameKey(user.tenant_id, user.username));
  }
  permissionsByUserId.delete(userId);
}

export async function grantPermission(
  app: TestApp,
  userId: string,
  permission: string,
): Promise<void> {
  if (!permissionsByUserId.has(userId)) {
    permissionsByUserId.set(userId, new Set());
  }
  permissionsByUserId.get(userId)!.add(permission);
  await invalidateUserPermissionCache(app, userId);
}

export async function revokePermission(
  app: TestApp,
  userId: string,
  permission: string,
): Promise<void> {
  permissionsByUserId.get(userId)?.delete(permission);
  await invalidateUserPermissionCache(app, userId);
}

export async function resetUserPermissions(
  app: TestApp,
  userId: string,
): Promise<void> {
  permissionsByUserId.set(userId, new Set());
  await invalidateUserPermissionCache(app, userId);
}

export async function grantPlatformPermission(
  app: TestApp,
  adminId: string,
  permission: string,
): Promise<void> {
  if (!platformPermissionsByAdminId.has(adminId)) {
    platformPermissionsByAdminId.set(adminId, new Set());
  }
  platformPermissionsByAdminId.get(adminId)!.add(permission);
  await invalidatePlatformAdminPermissionCache(app, adminId);
}

export async function resetPlatformPermissions(
  app: TestApp,
  adminId: string,
): Promise<void> {
  platformPermissionsByAdminId.set(adminId, new Set());
  await invalidatePlatformAdminPermissionCache(app, adminId);
}

export { prismaMock, userPermissionCacheKey, platformAdminPermissionCacheKey };
