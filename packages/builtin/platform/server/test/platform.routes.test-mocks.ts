import { vi } from "vitest";

vi.mock("@be-water/server-kernel/lib/config.js", () => ({
  config: {
    auth: {
      jwtSecret: "test-secret",
      bcryptSaltRounds: 4,
      platformAdmin: {
        username: "platform",
        password: "secret",
        passwordHash: "",
      },
    },
    /*
     * 两个 origin 都避开 `localhost`——`app.inject()` 不带 Host 头时用的就是它。
     * auth 中间件每个 /api 请求都会 `resolveHostTenant()`：命中 `frontend.url`
     * 会隐式绑定默认租户，`/api/platform/*` 随即被挡成 403。
     * 且 `platform.url` **不能缺**，否则 `config.platform` 是 undefined，直接 500。
     */
    frontend: {
      url: "http://app.test",
    },
    platform: {
      url: "http://console.test",
    },
    tenant: {
      singleTenant: false,
      baseDomain: "",
    },
    server: {
      isProduction: false,
      isTest: true,
      logLevel: "silent",
    },
    database: {
      url: "postgres://test:test@localhost:5432/test",
      restore: {
        maxUploadFileBytes: 10 * 1024 * 1024 * 1024,
      },
    },
  },
}));

vi.mock("../background-jobs/job-exports.js", () => ({
  getDatabaseBackupJobForUser: vi.fn(),
  getDataBackupJobForUser: vi.fn(),
  startDatabaseBackupBackgroundJob: vi.fn(),
  startDataBackupBackgroundJob: vi.fn(),
  startDataRestoreBackgroundJob: vi.fn(),
  startDatabaseRestoreBackgroundJob: vi.fn(),
}));

vi.mock("../../../background-job/server/job-exports.js", () => ({
  listBackgroundJobsForUser: vi.fn().mockResolvedValue([]),
  getBackgroundJobForUser: vi.fn(),
  cancelBackgroundJobForUser: vi.fn(),
}));

vi.mock("../services/backup-download.service.js", () => ({
  createDatabaseBackupDownloadToken: vi.fn(),
  consumeDatabaseBackupDownloadToken: vi.fn(),
  openDatabaseBackupFileStream: vi.fn(),
  buildDatabaseBackupContentDisposition: (filename: string) =>
    `attachment; filename="${filename}"`,
}));

vi.mock("../services/backup.service.js", () => ({
  BackupService: {
    restoreBackup: vi.fn(),
  },
}));

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
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    platformAdmin: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    platformAdminRole: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    role: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@be-water/server-kernel/kernel/auth/auth.service.js", () => ({
  AuthService: {
    hashPassword: vi.fn().mockResolvedValue("hashed_password"),
    revokeAllUserTokens: vi.fn(),
  },
}));

// 只 mock 查询：写入统一走 EventBus 的 `audit.log`，平台路由不再直接调用本服务。
vi.mock("../../../audit/server/audit.service.js", () => ({
  AuditService: {
    getAuditLogs: vi.fn().mockResolvedValue([]),
    getAuditLogsCount: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("../../../error-log/server/error.service.js", () => ({
  ErrorService: {
    getErrorLogs: vi.fn().mockResolvedValue([]),
    getErrorLogsCount: vi.fn().mockResolvedValue(0),
    getErrorStats: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../services/platform-settings.service.js", () => ({
  getPlatformSettings: vi.fn().mockResolvedValue({
    registration_enabled: true,
    require_tenant_approval: false,
  }),
  savePlatformSettings: vi.fn().mockImplementation(async (c) => c),
}));

vi.mock("../services/plan-limit-templates.service.js", () => ({
  getPlanLimitTemplates: vi.fn().mockResolvedValue({}),
  savePlanLimitTemplates: vi.fn().mockImplementation(async (t) => t),
}));

vi.mock("../services/tenant-management.service.js", () => ({
  listTenants: vi.fn(),
  createTenant: vi.fn(),
  patchTenant: vi.fn(),
  archiveTenant: vi.fn(),
  impersonateTenantAdmin: vi.fn(),
  getTenantStats: vi.fn(),
  getTenantIntegrationStatus: vi.fn(),
  resetTenantAdminPassword: vi.fn(),
  updateTenantPlan: vi.fn(),
  getTenantById: vi.fn(),
  listTenantUsers: vi.fn(),
  listPlatformUsers: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
  }),
}));

vi.mock("../services/tenant-feature.service.js", () => ({
  getTenantFeatureFlags: vi.fn().mockResolvedValue({
  }),
  saveTenantFeatureFlags: vi.fn().mockImplementation(async (_id, flags) => ({
    ...flags,
  })),
}));

vi.mock("../services/tenant-module.service.js", () => ({
  getTenantModuleFlags: vi.fn().mockResolvedValue({
    notes: true,
    document: true,
  }),
  saveTenantModuleFlags: vi
    .fn()
    .mockImplementation(async (_id, modules) => modules),
}));

vi.mock("../services/tenant-entitlement.service.js", () => ({
  getTenantEntitlements: vi.fn().mockResolvedValue({
    modules: {
      notes: true,
      document: true,
    },
    features: {
    },
  }),
  saveTenantEntitlements: vi.fn().mockImplementation(async (_id, body) => ({
    modules: body.modules ?? {
      notes: true,
      document: true,
    },
    features: {
      ...(body.features ?? {}),
    },
  })),
}));


vi.mock("../services/backup-path.service.js", () => ({
  listLocalRestoreCandidates: vi.fn().mockResolvedValue([]),
  resolveAllowedLocalRestorePath: vi.fn().mockResolvedValue("/tmp/test.dump"),
}));
