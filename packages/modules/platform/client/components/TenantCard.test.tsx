import { createQueryWrapper, createTestQueryClient } from "@be-water/client-test";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";


import { TenantCard } from "./TenantCard.js";

import type { TenantSummary } from "../../shared/index.js";

vi.mock("./TenantStats.js", () => ({
  TenantStats: () => <div data-testid="tenant-stats">stats</div>,
}));

vi.mock(
  "./TenantFeaturesSheet.js",
  () => ({
    TenantFeaturesSheet: () => <button type="button">功能</button>,
  }),
);

vi.mock(
  "./TenantIntegrationSheet.js",
  () => ({
    TenantIntegrationSheet: () => <button type="button">集成</button>,
  }),
);

vi.mock(
  "./TenantResetPasswordSheet.js",
  () => ({
    TenantResetPasswordSheet: () => <button type="button">密码</button>,
  }),
);

vi.mock("./TenantEditSheet.js", () => ({
  TenantEditSheet: () => <button type="button">编辑</button>,
}));

vi.mock("./TenantPlanSheet.js", () => ({
  TenantPlanSheet: () => <button type="button">套餐</button>,
}));

vi.mock(
  "./TenantImpersonateSheet.js",
  () => ({
    TenantImpersonateSheet: () => <button type="button">登录</button>,
  }),
);

vi.mock("../shell/platform-widget-slots.js", () => ({
  tenantCardActionsSlot: {
    useSlot: () => () => <button type="button">业务入口</button>,
  },
}));

vi.mock("@be-water/client-kit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@be-water/client-kit")>();
  return {
    ...actual,
    usePublicConfig: () => ({
      data: {
        registration_enabled: false,
        captcha_enabled: false,
        default_locale: "zh-CN" as const,
        github_oauth_enabled: false,
        google_oauth_enabled: false,
        single_tenant: false,
        bound_tenant: null,
        tenant_base_domain: "moms.plus",
        platform_url: "https://platform.moms.plus",
      },
    }),
  };
});

const baseTenant: TenantSummary = {
  id: "t1",
  slug: "acme",
  name: "Acme 公司",
  remark: "测试备注",
  custom_domain: null,
  status: "active",
  plan: "free",
  plan_since: null,
  plan_ends_at: null,
  created_at: "2024-01-15T00:00:00.000Z",
  updated_at: "2024-01-15T00:00:00.000Z",
};

const handlers = {
  onActingChange: vi.fn(),
  onToggleStatus: vi.fn(),
  onArchive: vi.fn(),
};

describe("TenantCard", () => {
  const wrapper = createQueryWrapper(createTestQueryClient());

  it("应该渲染租户基本信息", () => {
    render(<TenantCard tenant={baseTenant} {...handlers} />, {
      wrapper,
    });

    expect(screen.getByText("acme")).toBeInTheDocument();
    expect(screen.getByText("Acme 公司")).toBeInTheDocument();
    expect(screen.getByText("正常")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-stats")).toBeInTheDocument();
  });

  it("应该渲染各操作按钮", () => {
    render(<TenantCard tenant={baseTenant} {...handlers} />, {
      wrapper,
    });

    expect(screen.getByRole("button", { name: "编辑" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "功能" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "套餐" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "集成" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "密码" })).toBeInTheDocument();
  });

  it("已归档租户不应显示操作按钮", () => {
    render(
      <TenantCard
        tenant={{ ...baseTenant, status: "archived" }}
        {...handlers}
      />,
      { wrapper },
    );

    expect(
      screen.queryByRole("button", { name: "编辑" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("已归档")).toBeInTheDocument();
  });

  it("default 租户不应显示暂停与归档", () => {
    render(
      <TenantCard tenant={{ ...baseTenant, slug: "default" }} {...handlers} />,
      { wrapper },
    );

    expect(
      screen.queryByRole("button", { name: "暂停" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "归档" }),
    ).not.toBeInTheDocument();
  });

  it("活跃租户应显示代登录按钮", () => {
    render(<TenantCard tenant={baseTenant} {...handlers} />, {
      wrapper,
    });

    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });
});
