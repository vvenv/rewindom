import { DEFAULT_TENANT_ID } from "@rewindom/shared";
import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/config.js", () => ({
  config: {
    auth: {
      bcryptSaltRounds: 4,
      platformAdmin: {
        username: "platform",
        password: "platform-secret",
        passwordHash: "",
      },
    },
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    platformAdmin: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    platformAdminRefreshToken: {
      create: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import { prisma } from "../../lib/prisma.js";

import { AuthService } from "./auth.service.js";

const mockTenant = {
  id: DEFAULT_TENANT_ID,
  slug: "default",
  name: "默认租户",
  status: "active",
  created_at: new Date(),
  updated_at: new Date(),
};

const jwtSign = vi.fn(
  (payload: { type: string; userId: string }) =>
    `token_${payload.type}_${payload.userId}`,
);

describe("AuthService logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({
      count: 1,
    } as never);
    vi.mocked(prisma.platformAdminRefreshToken.updateMany).mockResolvedValue({
      count: 0,
    } as never);
  });

  it("同时撤销 user 与 platform admin 的 refresh token", async () => {
    await AuthService.logout("some-refresh-token");

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { token: "some-refresh-token" },
      data: { revoked: true },
    });
    expect(prisma.platformAdminRefreshToken.updateMany).toHaveBeenCalledWith({
      where: { token: "some-refresh-token" },
      data: { revoked: true },
    });
  });
});

describe("AuthService revokeAllPlatformAdminTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.platformAdminRefreshToken.updateMany).mockResolvedValue({
      count: 3,
    } as never);
  });

  it("按 admin_id 撤销所有 token", async () => {
    await AuthService.revokeAllPlatformAdminTokens("admin-1");

    expect(prisma.platformAdminRefreshToken.updateMany).toHaveBeenCalledWith({
      where: { admin_id: "admin-1" },
      data: { revoked: true },
    });
  });
});

describe("AuthService issueSessionForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);
  });

  it("OAuth 成功后签发双 token 并更新登录时间", async () => {
    const now = new Date();
    const user = {
      id: "user-1",
      username: "alice",
      is_system_admin: false,
      enabled: true,
      tenant_id: DEFAULT_TENANT_ID,
      tenant: mockTenant,
      created_at: now,
      updated_at: now,
      last_login_at: null,
      last_access_at: null,
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    vi.mocked(prisma.user.update).mockResolvedValue(user as never);

    const result = await AuthService.issueSessionForUser("user-1", jwtSign);

    expect(result.user.actor_type).toBe("tenant_user");
    expect(result.user.id).toBe("user-1");
    expect(result.tenant_slug).toBe("default");
    expect(result.tokens.accessToken).toBe("token_access_user-1");
    expect(result.tokens.refreshToken).toBe("token_refresh_user-1");
    // 清除失败计数 + 更新登录时间
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: expect.any(Date),
        last_access_at: expect.any(Date),
      },
    });
  });

  it("用户不存在抛 NotFoundError(user.not_found)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    await expect(
      AuthService.issueSessionForUser("missing", jwtSign),
    ).rejects.toMatchObject({ code: "user.not_found" });
  });

  it("租户不存在抛 NotFoundError", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      tenant: null,
    } as never);

    await expect(
      AuthService.issueSessionForUser("user-1", jwtSign),
    ).rejects.toMatchObject({ code: "user.not_found" });
  });

  it("用户被禁用抛 auth.account_disabled", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      enabled: false,
      tenant: mockTenant,
    } as never);

    await expect(
      AuthService.issueSessionForUser("user-1", jwtSign),
    ).rejects.toMatchObject({ code: "auth.account_disabled" });
  });

  it("租户非 active 抛 auth.invalid_credentials", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      enabled: true,
      tenant: { ...mockTenant, status: "suspended" },
    } as never);

    await expect(
      AuthService.issueSessionForUser("user-1", jwtSign),
    ).rejects.toMatchObject({ code: "auth.invalid_credentials" });
  });
});

describe("AuthService.refresh platform_admin 分支", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.platformAdminRefreshToken.create).mockResolvedValue(
      {} as never,
    );
  });

  const adminPayload = {
    userId: "admin-1",
    actor_type: "platform_admin" as const,
    is_system_admin: true,
    type: "refresh",
  };

  it("有效 admin refresh token 轮换:旧 token revoke + 新 token 签发", async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    vi.mocked(prisma.platformAdminRefreshToken.findUnique).mockResolvedValue({
      id: "rt-1",
      token: "admin-refresh",
      revoked: false,
      expires_at: future,
      admin: {
        id: "admin-1",
        username: "platform",
        is_system_admin: true,
        enabled: true,
      },
    } as never);
    vi.mocked(prisma.platformAdminRefreshToken.update).mockResolvedValue(
      {} as never,
    );

    const jwtVerify = vi.fn(() => adminPayload);

    const tokens = await AuthService.refresh(
      "admin-refresh",
      jwtSign,
      jwtVerify,
    );

    expect(tokens.accessToken).toBe("token_access_admin-1");
    // 旧 token 撤销
    expect(prisma.platformAdminRefreshToken.update).toHaveBeenCalledWith({
      where: { id: "rt-1" },
      data: { revoked: true },
    });
    // 新 token 落库
    expect(prisma.platformAdminRefreshToken.create).toHaveBeenCalledWith({
      data: {
        admin_id: "admin-1",
        token: tokens.refreshToken,
        expires_at: expect.any(Date),
      },
    });
  });

  it("storedToken 不存在抛 auth.refresh_invalid", async () => {
    vi.mocked(prisma.platformAdminRefreshToken.findUnique).mockResolvedValue(
      null as never,
    );

    await expect(
      AuthService.refresh(
        "ghost",
        jwtSign,
        vi.fn(() => adminPayload),
      ),
    ).rejects.toMatchObject({ code: "auth.refresh_invalid" });
  });

  it("已撤销 token 抛 auth.refresh_invalid", async () => {
    vi.mocked(prisma.platformAdminRefreshToken.findUnique).mockResolvedValue({
      id: "rt-1",
      revoked: true,
      expires_at: new Date(Date.now() + 10000),
      admin: { id: "admin-1", enabled: true, is_system_admin: true },
    } as never);

    await expect(
      AuthService.refresh(
        "revoked",
        jwtSign,
        vi.fn(() => adminPayload),
      ),
    ).rejects.toMatchObject({ code: "auth.refresh_invalid" });
  });

  it("过期 token 抛 auth.refresh_expired 并撤销", async () => {
    vi.mocked(prisma.platformAdminRefreshToken.findUnique).mockResolvedValue({
      id: "rt-1",
      revoked: false,
      expires_at: new Date(Date.now() - 1000),
      admin: { id: "admin-1", enabled: true, is_system_admin: true },
    } as never);
    vi.mocked(prisma.platformAdminRefreshToken.update).mockResolvedValue(
      {} as never,
    );

    await expect(
      AuthService.refresh(
        "expired",
        jwtSign,
        vi.fn(() => adminPayload),
      ),
    ).rejects.toMatchObject({ code: "auth.refresh_expired" });

    expect(prisma.platformAdminRefreshToken.update).toHaveBeenCalledWith({
      where: { id: "rt-1" },
      data: { revoked: true },
    });
  });

  it("admin 被禁用抛 auth.account_disabled", async () => {
    vi.mocked(prisma.platformAdminRefreshToken.findUnique).mockResolvedValue({
      id: "rt-1",
      revoked: false,
      expires_at: new Date(Date.now() + 10000),
      admin: { id: "admin-1", enabled: false, is_system_admin: true },
    } as never);

    await expect(
      AuthService.refresh(
        "disabled",
        jwtSign,
        vi.fn(() => adminPayload),
      ),
    ).rejects.toMatchObject({ code: "auth.account_disabled" });
  });

  it("jwtVerify 抛错转 auth.refresh_invalid", async () => {
    const jwtVerify = vi.fn(() => {
      throw new Error("bad signature");
    });

    await expect(
      AuthService.refresh("bad", jwtSign, jwtVerify),
    ).rejects.toMatchObject({ code: "auth.refresh_invalid" });
  });

  it("type 不是 refresh 抛 auth.token_invalid_type", async () => {
    await expect(
      AuthService.refresh(
        "wrong-type",
        jwtSign,
        vi.fn(() => ({ ...adminPayload, type: "access" })),
      ),
    ).rejects.toMatchObject({ code: "auth.token_invalid_type" });
  });
});

describe("AuthService.login hostTenant 分支", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);
    // platform admin 查询始终返回 null(走租户分支)
    vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue(null as never);
  });

  const hostTenant = {
    tenant_id: DEFAULT_TENANT_ID,
    tenant_slug: "default",
    name: "默认租户",
  };

  const makeUser = () => ({
    id: "user-1",
    username: "alice",
    password: "hashed",
    is_system_admin: false,
    enabled: true,
    locked_until: null,
    failed_login_attempts: 0,
    last_login_at: null,
    last_access_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    tenant_id: DEFAULT_TENANT_ID,
  });

  it("hostTenant + 纯用户名:用 hostTenant.slug 并按 id 查租户", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as never);
    const user = makeUser();
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ ...user, password: undefined } as never) // 第一次(omit password)
      .mockResolvedValueOnce(user as never); // 第二次(完整)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(prisma.user.update).mockResolvedValue(user as never);

    const result = await AuthService.login(
      { username: "alice", password: "pw" },
      jwtSign,
      { hostTenant },
    );

    // 应该按 id 查租户(hostTenant 路径)
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: DEFAULT_TENANT_ID },
    });
    expect(result.tenant_slug).toBe("default");
    expect(result.user.actor_type).toBe("tenant_user");
  });

  it("hostTenant + 用户名@slug 且 slug 匹配:正常登录", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as never);
    const user = makeUser();
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ ...user, password: undefined } as never)
      .mockResolvedValueOnce(user as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(prisma.user.update).mockResolvedValue(user as never);

    const result = await AuthService.login(
      { username: "alice@default", password: "pw" },
      jwtSign,
      { hostTenant },
    );

    expect(result.tenant_slug).toBe("default");
    // 用户名应是去掉 @default 后的 alice
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        tenant_id_username: {
          tenant_id: DEFAULT_TENANT_ID,
          username: "alice",
        },
      },
      omit: { tenant_id: true, password: true },
    });
  });

  it("hostTenant + 用户名@slug 但 slug 不匹配:抛 auth.tenant_host_mismatch", async () => {
    await expect(
      AuthService.login({ username: "alice@other", password: "pw" }, jwtSign, {
        hostTenant,
      }),
    ).rejects.toMatchObject({ code: "auth.tenant_host_mismatch" });

    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it("无 hostTenant + 纯用户名(非平台管理员):走 parseLoginIdentifier 视为 default 租户", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as never);
    const user = makeUser();
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ ...user, password: undefined } as never)
      .mockResolvedValueOnce(user as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(prisma.user.update).mockResolvedValue(user as never);

    const result = await AuthService.login(
      { username: "alice", password: "pw" },
      jwtSign,
    );

    // 无 hostTenant 时按 slug 查租户
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "default" },
    });
    expect(result.tenant_slug).toBe("default");
  });
});

describe("AuthService.changePassword platform_admin 分支", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bcrypt.hash).mockResolvedValue("new-hash" as never);
  });

  it("平台管理员修改密码:查 admin + 校验 + 更新", async () => {
    vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue({
      id: "admin-1",
      username: "platform",
      password: "old-hash",
      is_system_admin: true,
      enabled: true,
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(prisma.platformAdmin.update).mockResolvedValue({} as never);

    await AuthService.changePassword({
      userId: "admin-1",
      actor_type: "platform_admin",
      oldPassword: "old",
      newPassword: "new",
    });

    expect(prisma.platformAdmin.findUnique).toHaveBeenCalledWith({
      where: { id: "admin-1" },
    });
    expect(prisma.platformAdmin.update).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      data: { password: "new-hash" },
    });
  });

  it("admin 不存在抛 user.not_found", async () => {
    vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue(null as never);

    await expect(
      AuthService.changePassword({
        userId: "admin-1",
        actor_type: "platform_admin",
        oldPassword: "old",
        newPassword: "new",
      }),
    ).rejects.toMatchObject({ code: "user.not_found" });
  });

  it("旧密码错误抛 auth.old_password_wrong", async () => {
    vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue({
      id: "admin-1",
      password: "old-hash",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      AuthService.changePassword({
        userId: "admin-1",
        actor_type: "platform_admin",
        oldPassword: "wrong",
        newPassword: "new",
      }),
    ).rejects.toMatchObject({ code: "auth.old_password_wrong" });
  });
});
