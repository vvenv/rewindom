import { createQueryWrapper, createTestQueryClient } from "@be-water/client-test";
import { server } from "@be-water/client-test/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect, vi, beforeEach } from "vitest";


import { TenantEditSheet } from "./TenantEditSheet.js";

import type { TenantSummary } from "../../shared/index.js";

// 真实渲染：不再 mock usePatchPlatformTenant（原文件本就未 mock UI 组件）。
// 保留 @be-water/ui/toast mock（sonner 副作用隔离）

vi.mock("@be-water/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { toast } = await import("@be-water/ui/toast");

const PATCH_URL = "/api/platform/tenants/:id";

const mockTenant: TenantSummary = {
  id: "tenant-1",
  slug: "test-tenant",
  name: "Test Tenant",
  remark: "Test remark",
  custom_domain: null,
  status: "active",
  plan: "free",
  plan_since: null,
  plan_ends_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

interface RenderProps {
  tenant?: TenantSummary;
  disabled?: boolean;
  onActingChange?: (acting: boolean) => void;
}

function renderSheet(props: RenderProps = {}) {
  const wrapper = createQueryWrapper(createTestQueryClient());
  return render(
    <TenantEditSheet
      tenant={props.tenant ?? mockTenant}
      disabled={props.disabled}
      onActingChange={props.onActingChange ?? vi.fn()}
    />,
    { wrapper },
  );
}

// 渲染并打开 sheet（点击编辑按钮）
function openSheet(props: RenderProps = {}) {
  const onActingChange = props.onActingChange ?? vi.fn();
  renderSheet({ ...props, onActingChange });
  fireEvent.click(screen.getByRole("button", { name: "编辑" }));
  return onActingChange;
}

describe("TenantEditSheet", () => {
  const mockOnActingChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该渲染编辑按钮", () => {
    renderSheet({ onActingChange: mockOnActingChange });

    expect(screen.getByRole("button", { name: "编辑" })).toBeInTheDocument();
  });

  it("点击编辑按钮应该打开对话框", () => {
    openSheet({ onActingChange: mockOnActingChange });

    expect(
      screen.getByText(`编辑租户 — ${mockTenant.slug}`),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("名称")).toBeInTheDocument();
    expect(screen.getByLabelText("标识 (slug)")).toBeInTheDocument();
    expect(screen.getByLabelText("备注")).toBeInTheDocument();
  });

  it("打开对话框时应该初始化表单值", () => {
    openSheet({ onActingChange: mockOnActingChange });

    expect(screen.getByLabelText("名称")).toHaveValue(mockTenant.name);
    expect(screen.getByLabelText("标识 (slug)")).toHaveValue(mockTenant.slug);
    expect(screen.getByLabelText("备注")).toHaveValue(mockTenant.remark);
  });

  it("打开对话框时应该处理空备注", () => {
    openSheet({
      tenant: { ...mockTenant, remark: null },
      onActingChange: mockOnActingChange,
    });

    expect(screen.getByLabelText("备注")).toHaveValue("");
  });

  it("空名称时保存应该显示错误", async () => {
    let calls = 0;
    server.use(
      http.patch(PATCH_URL, () => {
        calls += 1;
        return HttpResponse.json({ data: mockTenant });
      }),
    );

    openSheet({ onActingChange: mockOnActingChange });
    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(calls).toBe(0);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("租户名称不能为空");
    });
  });

  it("成功保存应该调用 API 并关闭对话框", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.patch(PATCH_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: mockTenant });
      }),
    );

    const onActingChange = openSheet({ onActingChange: mockOnActingChange });

    fireEvent.change(screen.getByLabelText("标识 (slug)"), {
      target: { value: "new-slug" },
    });
    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "New Name" },
    });
    fireEvent.change(screen.getByLabelText("备注"), {
      target: { value: "New remark" },
    });

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onActingChange).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(capturedBody).toEqual({
        slug: "new-slug",
        name: "New Name",
        remark: "New remark",
        custom_domain: null,
      });
    });

    await waitFor(() => {
      expect(onActingChange).toHaveBeenCalledWith(false);
    });

    await waitFor(() => {
      expect(
        screen.queryByText(`编辑租户 — ${mockTenant.slug}`),
      ).not.toBeInTheDocument();
    });
  });

  it("保存失败应该显示错误信息", async () => {
    server.use(
      http.patch(PATCH_URL, () =>
        HttpResponse.json({ error: "保存失败" }, { status: 500 }),
      ),
    );

    const onActingChange = openSheet({ onActingChange: mockOnActingChange });

    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "New Name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onActingChange).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(onActingChange).toHaveBeenCalledWith(false);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("保存失败");
    });
  });

  it("点击取消应该关闭对话框", () => {
    openSheet({ onActingChange: mockOnActingChange });

    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(
      screen.queryByText(`编辑租户 — ${mockTenant.slug}`),
    ).not.toBeInTheDocument();
  });

  it("disabled 状态下编辑按钮应该禁用", () => {
    renderSheet({ disabled: true, onActingChange: mockOnActingChange });

    expect(screen.getByRole("button", { name: "编辑" })).toBeDisabled();
  });

  it("保存时应该修剪备注的空格", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.patch(PATCH_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: mockTenant });
      }),
    );

    openSheet({ onActingChange: mockOnActingChange });

    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "New Name" },
    });
    fireEvent.change(screen.getByLabelText("备注"), {
      target: { value: "  New remark  " },
    });

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        slug: "test-tenant",
        name: "New Name",
        remark: "New remark",
        custom_domain: null,
      });
    });
  });

  it("默认租户 slug 输入框应禁用且不提交 slug", async () => {
    const defaultTenant = { ...mockTenant, slug: "default" };
    let capturedBody: unknown = null;
    server.use(
      http.patch(PATCH_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: defaultTenant });
      }),
    );

    openSheet({ tenant: defaultTenant, onActingChange: mockOnActingChange });

    expect(screen.getByLabelText("标识 (slug)")).toBeDisabled();

    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "New Name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        name: "New Name",
        remark: "Test remark",
        custom_domain: null,
      });
    });
  });

  it("空备注应该转换为 null", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.patch(PATCH_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: mockTenant });
      }),
    );

    openSheet({ onActingChange: mockOnActingChange });

    fireEvent.change(screen.getByLabelText("名称"), {
      target: { value: "New Name" },
    });
    fireEvent.change(screen.getByLabelText("备注"), {
      target: { value: "   " },
    });

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        slug: "test-tenant",
        name: "New Name",
        remark: null,
        custom_domain: null,
      });
    });
  });
});
