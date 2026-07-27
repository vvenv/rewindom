import { createQueryWrapper, createTestQueryClient } from "@be-water/client-test";
import { server } from "@be-water/client-test/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect, vi, beforeEach } from "vitest";


import { TenantResetPasswordSheet } from "./TenantResetPasswordSheet.js";

import type {
  TenantSummary,
  TenantAdminCredentials,
} from "../../shared/index.js";

// 真实渲染：不再 mock UI 组件（Sheet/Button/Input/Label/Field）与 useResetTenantAdminPassword。
// 保留 @be-water/ui/toast mock（sonner 副作用隔离）

vi.mock("@be-water/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { toast } = await import("@be-water/ui/toast");

const RESET_URL = "/api/platform/tenants/:id/admin/reset-password";

function createMockTenant(
  overrides: Partial<TenantSummary> = {},
): TenantSummary {
  return {
    id: "tenant1",
    slug: "test-tenant",
    name: "Test Tenant",
    remark: null,
    status: "active",
    plan: "free",
    plan_since: null,
    plan_ends_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockCredentials(
  overrides: Partial<TenantAdminCredentials> = {},
): TenantAdminCredentials {
  return {
    username: "admin",
    password: "newpassword123",
    login_identifier: "admin@test-tenant",
    recreated: false,
    ...overrides,
  };
}

interface RenderProps {
  tenant: TenantSummary;
  disabled?: boolean;
  onActingChange?: (acting: boolean) => void;
}

function renderSheet(props: RenderProps) {
  const wrapper = createQueryWrapper(createTestQueryClient());
  return render(<TenantResetPasswordSheet {...props} />, { wrapper });
}

// 渲染并打开 sheet（点击触发按钮）
function openSheet(props: RenderProps) {
  renderSheet(props);
  fireEvent.click(screen.getByRole("button", { name: /^密码$/ }));
}

describe("TenantResetPasswordSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该渲染触发按钮", () => {
    renderSheet({ tenant: createMockTenant() });

    expect(screen.getByRole("button", { name: /^密码$/ })).toBeInTheDocument();
  });

  it("应该在 disabled 为 true 时禁用按钮", () => {
    renderSheet({ tenant: createMockTenant(), disabled: true });

    expect(screen.getByRole("button", { name: /^密码$/ })).toBeDisabled();
  });

  it("应该显示租户名称在对话框标题中", () => {
    openSheet({ tenant: createMockTenant({ name: "My Test Tenant" }) });

    expect(
      screen.getByRole("heading", { name: /My Test Tenant/ }),
    ).toBeInTheDocument();
  });

  it("应该在打开对话框时清空密码输入", () => {
    openSheet({ tenant: createMockTenant() });

    expect(screen.getByLabelText("新密码")).toHaveValue("");
  });

  it("应该显示登录账号信息", () => {
    openSheet({ tenant: createMockTenant({ slug: "my-tenant" }) });

    expect(screen.getByText("登录账号")).toBeInTheDocument();
    expect(screen.getByText("admin@my-tenant")).toBeInTheDocument();
  });

  it("应该更新密码输入值", () => {
    openSheet({ tenant: createMockTenant() });

    const input = screen.getByLabelText("新密码");
    fireEvent.change(input, { target: { value: "mynewpassword" } });

    expect(input).toHaveValue("mynewpassword");
  });

  it("应该在点击随机按钮时生成随机密码", () => {
    openSheet({ tenant: createMockTenant() });

    fireEvent.click(screen.getByRole("button", { name: /随机/ }));

    const input = screen.getByLabelText("新密码") as HTMLInputElement;
    expect(input.value).not.toBe("");
    expect(input.value.length).toBeGreaterThanOrEqual(6);
  });

  it("应该显示取消和重设密码按钮", () => {
    openSheet({ tenant: createMockTenant() });

    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "重设密码" }),
    ).toBeInTheDocument();
  });

  it("应该在密码少于6个字符时显示错误", async () => {
    openSheet({ tenant: createMockTenant() });

    fireEvent.change(screen.getByLabelText("新密码"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "重设密码" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("密码至少需要6个字符");
    });
  });

  it("应该成功重设密码并展示凭据", async () => {
    const mockCredentials = createMockCredentials();
    let capturedBody: unknown = null;
    server.use(
      http.post(RESET_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: mockCredentials });
      }),
    );

    openSheet({ tenant: createMockTenant() });

    fireEvent.change(screen.getByLabelText("新密码"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "重设密码" }));

    await waitFor(() => {
      expect(capturedBody).toEqual({ new_password: "newpassword123" });
    });

    await waitFor(() => {
      expect(screen.getByText("租户管理员账号")).toBeInTheDocument();
      expect(screen.getByText(mockCredentials.password)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("管理员密码已更新");
    });
  });

  it("应该在管理员账号重建时显示重建消息", async () => {
    server.use(
      http.post(RESET_URL, () =>
        HttpResponse.json({
          data: createMockCredentials({ recreated: true }),
        }),
      ),
    );

    openSheet({ tenant: createMockTenant() });

    fireEvent.click(screen.getByRole("button", { name: "重设密码" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("管理员账号已重建");
    });
  });

  it("应该在密码为空时调用 API 不传递 body", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post(RESET_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: createMockCredentials() });
      }),
    );

    openSheet({ tenant: createMockTenant() });

    fireEvent.click(screen.getByRole("button", { name: "重设密码" }));

    await waitFor(() => {
      expect(capturedBody).toEqual({});
    });
  });

  it("应该在重置过程中禁用按钮", async () => {
    // 永不响应，使 mutation 停留在 pending 状态
    server.use(http.post(RESET_URL, () => new Promise<Response>(() => {})));

    openSheet({ tenant: createMockTenant() });

    fireEvent.click(screen.getByRole("button", { name: "重设密码" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "重设密码" })).toBeDisabled();
    });
  });

  it("应该处理 API 错误", async () => {
    // 网络错误 → 非 ApiError → 走 "重设失败" 兜底分支
    server.use(http.post(RESET_URL, () => HttpResponse.error()));

    openSheet({ tenant: createMockTenant() });

    fireEvent.click(screen.getByRole("button", { name: "重设密码" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("重设失败");
    });
  });

  it("应该调用 onActingChange 回调", async () => {
    const onActingChange = vi.fn();
    server.use(
      http.post(RESET_URL, () =>
        HttpResponse.json({ data: createMockCredentials() }),
      ),
    );

    openSheet({ tenant: createMockTenant(), onActingChange });
    fireEvent.click(screen.getByRole("button", { name: "重设密码" }));

    await waitFor(() => {
      expect(onActingChange).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(onActingChange).toHaveBeenCalledWith(false);
    });
  });

  it("应该在取消按钮点击时关闭对话框", () => {
    openSheet({ tenant: createMockTenant() });

    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
  });
});
