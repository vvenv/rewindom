import { createQueryWrapper, createTestQueryClient } from "@be-water/client-test";
import { server } from "@be-water/client-test/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";


import { TenantIntegrationSheet } from "./TenantIntegrationSheet.js";

import type {
  TenantSummary,
  TenantIntegrationStatus,
} from "../../shared/index.js";

// 真实渲染：不再 mock UI 组件（Sheet/Button/Spinner）与 usePlatformTenantIntegrationStatus。
// 由 MSW 在网络层拦截 GET /api/platform/tenants/:id/integration-status。

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

function createMockIntegrationStatus(
  overrides: Partial<TenantIntegrationStatus> = {},
): TenantIntegrationStatus {
  return {
    openai_api: {
      configured: true,
      updated_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

function renderSheet(props: { tenant: TenantSummary; disabled?: boolean }) {
  const wrapper = createQueryWrapper(createTestQueryClient());
  return render(<TenantIntegrationSheet {...props} />, { wrapper });
}

const INTEGRATION_URL = "/api/platform/tenants/:id/integration-status";

describe("TenantIntegrationSheet", () => {
  it("应该渲染触发按钮", () => {
    renderSheet({ tenant: createMockTenant() });

    expect(screen.getByRole("button", { name: /集成/ })).toBeInTheDocument();
  });

  it("应该在 disabled 为 true 时禁用按钮", () => {
    renderSheet({ tenant: createMockTenant(), disabled: true });

    expect(screen.getByRole("button", { name: /集成/ })).toBeDisabled();
  });

  it("当对话框关闭时 hook 被传入 null", () => {
    // 组件默认 open=false，hook enabled=false，不会发起 integration-status 请求
    let calls = 0;
    server.use(
      http.get(INTEGRATION_URL, () => {
        calls += 1;
        return HttpResponse.json({ data: createMockIntegrationStatus() });
      }),
    );

    renderSheet({ tenant: createMockTenant() });

    expect(calls).toBe(0);
  });

  it("应该在加载中显示 spinner", async () => {
    // 永不响应，使 query 停留在 loading 状态
    server.use(
      http.get(INTEGRATION_URL, () => new Promise<Response>(() => {})),
    );

    renderSheet({ tenant: createMockTenant() });

    fireEvent.click(screen.getByRole("button", { name: /集成/ }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
    expect(screen.getByText("加载中…")).toBeInTheDocument();
  });

  it("应该显示 OpenAI API 集成状态", async () => {
    server.use(
      http.get(INTEGRATION_URL, () =>
        HttpResponse.json({ data: createMockIntegrationStatus() }),
      ),
    );

    renderSheet({ tenant: createMockTenant() });

    fireEvent.click(screen.getByRole("button", { name: /集成/ }));

    await waitFor(() => {
      expect(screen.getByText("OpenAI API")).toBeInTheDocument();
    });
    expect(screen.getByText(/已配置/)).toBeInTheDocument();
  });

  it("应该显示未配置的 OpenAI API", async () => {
    server.use(
      http.get(INTEGRATION_URL, () =>
        HttpResponse.json({
          data: createMockIntegrationStatus({
            openai_api: { configured: false, updated_at: null },
          }),
        }),
      ),
    );

    renderSheet({ tenant: createMockTenant() });

    fireEvent.click(screen.getByRole("button", { name: /集成/ }));

    await waitFor(() => {
      expect(screen.getByText("未配置")).toBeInTheDocument();
    });
  });

  it("应该显示集成配置标题", async () => {
    server.use(
      http.get(INTEGRATION_URL, () =>
        HttpResponse.json({ data: createMockIntegrationStatus() }),
      ),
    );

    const tenant = createMockTenant();
    renderSheet({ tenant });

    fireEvent.click(screen.getByRole("button", { name: /集成/ }));

    const title = await screen.findByRole("heading");
    expect(title).toHaveTextContent(`集成配置 — ${tenant.name}`);
  });

  it("应该在加载失败时显示错误信息", async () => {
    server.use(
      http.get(INTEGRATION_URL, () =>
        HttpResponse.json({ error: "失败" }, { status: 500 }),
      ),
    );

    renderSheet({ tenant: createMockTenant() });

    fireEvent.click(screen.getByRole("button", { name: /集成/ }));

    await waitFor(() => {
      expect(screen.getByText("加载失败")).toBeInTheDocument();
    });
  });
});
