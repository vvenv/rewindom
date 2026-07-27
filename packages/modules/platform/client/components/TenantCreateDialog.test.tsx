import { createQueryWrapper, createTestQueryClient } from "@be-water/client-test";
import { server } from "@be-water/client-test/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect, vi, beforeEach } from "vitest";


import { TenantCreateDialog } from "./TenantCreateDialog.js";

import type { TenantAdminCredentials } from "../../shared/index.js";

// 真实渲染：不再 mock UI 组件（Dialog/Button/Input/Label/Textarea/Field）与 useCreatePlatformTenant。
// 保留 @be-water/ui/toast mock（sonner 副作用隔离）

vi.mock("@be-water/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { toast } = await import("@be-water/ui/toast");

const CREATE_URL = "/api/platform/tenants";

function createMockCredentials(
  overrides: Partial<TenantAdminCredentials> = {},
): TenantAdminCredentials {
  return {
    username: "admin",
    password: "password123",
    login_identifier: "admin@acme",
    recreated: false,
    ...overrides,
  };
}

function renderDialog() {
  const wrapper = createQueryWrapper(createTestQueryClient());
  return render(<TenantCreateDialog />, { wrapper });
}

// 渲染并打开 dialog（点击新建租户触发按钮）
function openDialog() {
  renderDialog();
  fireEvent.click(screen.getByRole("button", { name: "新建租户" }));
}

describe("TenantCreateDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该渲染触发按钮", () => {
    renderDialog();

    expect(
      screen.getByRole("button", { name: "新建租户" }),
    ).toBeInTheDocument();
  });

  it("应该显示新建租户标题", () => {
    openDialog();

    expect(
      screen.getByRole("heading", { name: "新建租户" }),
    ).toBeInTheDocument();
  });

  it("应该渲染 slug 输入框", () => {
    openDialog();

    expect(screen.getByLabelText("标识 (slug)")).toBeInTheDocument();
    expect(screen.getByText("标识 (slug)")).toBeInTheDocument();
  });

  it("应该渲染 name 输入框", () => {
    openDialog();

    expect(screen.getByLabelText("名称")).toBeInTheDocument();
    expect(screen.getByText("名称")).toBeInTheDocument();
  });

  it("应该渲染 remark 输入框", () => {
    openDialog();

    expect(screen.getByLabelText("备注")).toBeInTheDocument();
    expect(screen.getByText("备注")).toBeInTheDocument();
  });

  it("应该显示 slug 提示信息", () => {
    openDialog();

    expect(screen.getByText("用户登录格式：用户名@acme")).toBeInTheDocument();
  });

  it("应该更新 slug 输入值", () => {
    openDialog();

    const input = screen.getByLabelText("标识 (slug)");
    fireEvent.change(input, { target: { value: "acme" } });

    expect(input).toHaveValue("acme");
  });

  it("应该更新 name 输入值", () => {
    openDialog();

    const input = screen.getByLabelText("名称");
    fireEvent.change(input, { target: { value: "Acme 公司" } });

    expect(input).toHaveValue("Acme 公司");
  });

  it("应该更新 remark 输入值", () => {
    openDialog();

    const textarea = screen.getByLabelText("备注");
    fireEvent.change(textarea, { target: { value: "测试备注" } });

    expect(textarea).toHaveValue("测试备注");
  });

  it("应该显示取消和创建按钮", () => {
    openDialog();

    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建" })).toBeInTheDocument();
  });

  it("应该在 slug 或 name 为空时禁用创建按钮", () => {
    openDialog();

    expect(screen.getByRole("button", { name: "创建" })).toBeDisabled();
  });

  it("应该在 slug 和 name 都有值时启用创建按钮", () => {
    openDialog();

    fireEvent.change(screen.getByLabelText("标识 (slug)"), {
      target: { value: "acme" },
    });
    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "Acme 公司" },
    });

    expect(screen.getByRole("button", { name: "创建" })).not.toBeDisabled();
  });

  it("应该在创建过程中禁用创建按钮", async () => {
    // 永不响应，使 mutation 停留在 pending 状态
    server.use(http.post(CREATE_URL, () => new Promise<Response>(() => {})));

    openDialog();

    fireEvent.change(screen.getByLabelText("标识 (slug)"), {
      target: { value: "acme" },
    });
    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "Acme 公司" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "创建" })).toBeDisabled();
    });
  });

  it("应该成功创建租户并展示凭据", async () => {
    const mockCredentials = createMockCredentials();
    let capturedBody: unknown = null;
    server.use(
      http.post(CREATE_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: { admin: mockCredentials } });
      }),
    );

    openDialog();

    fireEvent.change(screen.getByLabelText("标识 (slug)"), {
      target: { value: "acme" },
    });
    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "Acme 公司" },
    });
    fireEvent.change(screen.getByLabelText("备注"), {
      target: { value: "测试备注" },
    });

    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        slug: "acme",
        name: "Acme 公司",
        remark: "测试备注",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("租户管理员账号")).toBeInTheDocument();
      expect(
        screen.getByText(mockCredentials.login_identifier),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("租户已创建");
    });
  });

  it("应该在 remark 为空时传递 null", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post(CREATE_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          data: { admin: createMockCredentials() },
        });
      }),
    );

    openDialog();

    fireEvent.change(screen.getByLabelText("标识 (slug)"), {
      target: { value: "acme" },
    });
    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "Acme 公司" },
    });

    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        slug: "acme",
        name: "Acme 公司",
        remark: null,
      });
    });
  });

  it("应该在 remark 为空字符串时传递 null", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post(CREATE_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          data: { admin: createMockCredentials() },
        });
      }),
    );

    openDialog();

    fireEvent.change(screen.getByLabelText("标识 (slug)"), {
      target: { value: "acme" },
    });
    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "Acme 公司" },
    });
    fireEvent.change(screen.getByLabelText("备注"), {
      target: { value: "   " },
    });

    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        slug: "acme",
        name: "Acme 公司",
        remark: null,
      });
    });
  });

  it("应该处理 API 错误", async () => {
    // 网络错误 → 非 ApiError → 走 "创建失败" 兜底分支
    server.use(http.post(CREATE_URL, () => HttpResponse.error()));

    openDialog();

    fireEvent.change(screen.getByLabelText("标识 (slug)"), {
      target: { value: "acme" },
    });
    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "Acme 公司" },
    });

    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("创建失败");
    });
  });

  it("应该处理 ApiError 并显示错误消息", async () => {
    server.use(
      http.post(CREATE_URL, () =>
        HttpResponse.json({ error: "租户已存在" }, { status: 400 }),
      ),
    );

    openDialog();

    fireEvent.change(screen.getByLabelText("标识 (slug)"), {
      target: { value: "acme" },
    });
    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "Acme 公司" },
    });

    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("租户已存在");
    });
  });
});
