import { useAuth, type AuthContextType } from "@rewindom/client-kit";
import { TENANT_IMPERSONATION_USERNAME } from "@rewindom/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, it, expect, vi } from "vitest";

import { userMenuUsageSlot } from "../shell/user-menu-slots.js";

import { UserAvatar } from "./UserAvatar.js";

function createMockAuthContext(
  overrides: Partial<AuthContextType> = {},
): AuthContextType {
  return {
    user: {
      id: "user1",
      username: "testuser",
      actor_type: "tenant_user",
      is_system_admin: false,
      enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      last_login_at: "2024-01-01T00:00:00Z",
      last_access_at: "2024-01-01T00:00:00Z",
    },
    accessToken: null,
    refreshToken: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshAccessToken: vi.fn(),
    changePassword: vi.fn(),
    getCurrentUser: vi.fn(),
    ...overrides,
  } as unknown as AuthContextType;
}

vi.mock("@rewindom/client-kit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@rewindom/client-kit")>()),
  useAuth: vi.fn(),
  useColorMode: () => ({
    colorMode: "system" as const,
    setColorMode: vi.fn(),
  }),
}));

const mockIsInImpersonationSession = vi.fn();
const mockReadImpersonationMeta = vi.fn();

vi.mock("../../../platform/client/lib/impersonation-session.js", () => ({
  isInImpersonationSession: () => mockIsInImpersonationSession(),
  exitImpersonation: vi.fn(),
  logoutFully: vi.fn(),
}));

vi.mock("../../../platform/client/lib/impersonation-storage.js", () => ({
  readImpersonationMeta: () => mockReadImpersonationMeta(),
}));

function renderAvatar() {
  return render(
    <MemoryRouter>
      <UserAvatar />
    </MemoryRouter>,
  );
}

function openMenu() {
  const trigger = screen.getByRole("button");
  fireEvent.pointerDown(trigger, { button: 0 });
  fireEvent.pointerUp(trigger, { button: 0 });
}

describe("UserAvatar", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());
    mockIsInImpersonationSession.mockReturnValue(false);
    mockReadImpersonationMeta.mockReturnValue(null);
  });

  it("应该渲染用户头像", () => {
    const { container } = renderAvatar();

    expect(container.querySelector('[data-slot="avatar"]')).not.toBeNull();
  });

  it("应该显示用户名首字母", () => {
    renderAvatar();

    expect(screen.getByText("TE")).toBeInTheDocument();
  });

  it("应该显示下拉菜单", () => {
    renderAvatar();
    openMenu();

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("应该显示用户名", () => {
    renderAvatar();
    openMenu();

    expect(screen.getByText("testuser")).toBeInTheDocument();
  });

  it("应该显示用户类型标签", () => {
    renderAvatar();
    openMenu();

    expect(screen.getByText("组织用户")).toBeInTheDocument();
  });

  it("应该显示上次登录时间", () => {
    renderAvatar();
    openMenu();

    expect(screen.getByText(/上次登录/)).toBeInTheDocument();
  });

  it("应该显示修改密码选项", () => {
    renderAvatar();
    openMenu();

    expect(screen.getByText("修改密码")).toBeInTheDocument();
  });

  it("平台管理员不应显示修改密码选项", () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({
        user: {
          id: "00000000-0000-0000-0000-000000000000",
          username: "platform",
          actor_type: "platform_admin",
          is_system_admin: true,
          enabled: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          last_login_at: "2024-01-01T00:00:00Z",
          last_access_at: "2024-01-01T00:00:00Z",
        },
      }),
    );

    renderAvatar();
    openMenu();

    expect(screen.queryByText("修改密码")).not.toBeInTheDocument();
  });

  it("应该显示退出登录选项", () => {
    renderAvatar();
    openMenu();

    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("代登录时应显示返回平台管理与完全退出", () => {
    mockIsInImpersonationSession.mockReturnValue(true);
    mockReadImpersonationMeta.mockReturnValue({
      tenant_name: "测试租户",
      tenant_slug: "tenant-a",
      login_identifier: `${TENANT_IMPERSONATION_USERNAME}@tenant-a`,
    });
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext({
        user: {
          id: "shadow",
          username: TENANT_IMPERSONATION_USERNAME,
          actor_type: "tenant_user",
          is_system_admin: true,
          enabled: false,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          last_login_at: null,
          last_access_at: null,
        },
      }),
    );

    renderAvatar();
    openMenu();

    expect(screen.getByText("测试租户")).toBeInTheDocument();
    expect(screen.getByText("平台代登录")).toBeInTheDocument();
    expect(screen.getByText("返回平台管理")).toBeInTheDocument();
    expect(screen.getByText("完全退出")).toBeInTheDocument();
    expect(screen.queryByText("退出登录")).not.toBeInTheDocument();
    expect(screen.queryByText("修改密码")).not.toBeInTheDocument();
  });

  it("注入 userMenuUsageSlot 后应渲染用量卡", () => {
    render(
      <MemoryRouter>
        <userMenuUsageSlot.Provider
          component={() => <div>usage-card-stub</div>}
        >
          <UserAvatar />
        </userMenuUsageSlot.Provider>
      </MemoryRouter>,
    );
    openMenu();

    expect(screen.getByText("usage-card-stub")).toBeInTheDocument();
  });

  it("应该使用 ghost variant", () => {
    renderAvatar();

    const buttons = screen.getAllByRole("button");
    const avatarButton = buttons.find(
      (b) => b.getAttribute("data-variant") === "ghost",
    );
    expect(avatarButton).toBeInTheDocument();
  });
});
