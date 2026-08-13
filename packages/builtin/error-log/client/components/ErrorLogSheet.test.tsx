import {
  createQueryWrapper,
  createTestQueryClient,
} from "@rewindom/client-test/react-query";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { createMockErrorLog } from "../test-fixtures.js";

import { ErrorLogSheet } from "./ErrorLogSheet.js";

const permissionState = vi.hoisted(() => ({ canManage: true }));

vi.mock("@rewindom/client-kit", () => ({
  useAuth: () => ({
    user: { id: "user1", is_system_admin: true },
  }),
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(false) }),
  usePermissions: () => ({
    hasPermission: (permission: string) =>
      permission === "error_logs.manage" && permissionState.canManage,
  }),
}));

vi.mock("../hooks/useDeleteErrorLog.js", () => ({
  useDeleteErrorLog: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("ErrorLogSheet", () => {
  const wrapper = createQueryWrapper(createTestQueryClient());

  beforeEach(() => {
    permissionState.canManage = true;
  });

  it("应该显示错误详情与消息", () => {
    render(
      <ErrorLogSheet
        open
        onOpenChange={vi.fn()}
        log={createMockErrorLog({ message: "测试错误" })}
      />,
      { wrapper },
    );

    expect(screen.getByText("错误详情")).toBeInTheDocument();
    expect(screen.getByText("测试错误")).toBeInTheDocument();
  });

  it("jsonb 字段应格式化展示，为空时整块不渲染", () => {
    render(
      <ErrorLogSheet
        open
        onOpenChange={vi.fn()}
        log={createMockErrorLog({
          request_body: { user_id: "u-1", nested: { items: [1, 2] } },
          context: { statusCode: 500 },
          request_params: null,
          request_query: null,
        })}
      />,
      { wrapper },
    );

    expect(screen.getByText("请求体")).toBeInTheDocument();
    expect(
      screen.getByText(/"user_id": "u-1"/),
    ).toBeInTheDocument();
    expect(screen.getByText("上下文")).toBeInTheDocument();
    expect(screen.getByText(/"statusCode": 500/)).toBeInTheDocument();

    // 列为 NULL 时不该出现空的标题块
    expect(screen.queryByText("请求参数")).not.toBeInTheDocument();
    expect(screen.queryByText("查询参数")).not.toBeInTheDocument();
  });

  it("有 error_logs.manage 时显示删除按钮", () => {
    render(
      <ErrorLogSheet
        open
        onOpenChange={vi.fn()}
        log={createMockErrorLog()}
        allowDelete
      />,
      { wrapper },
    );

    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
  });

  it("无 error_logs.manage 时只能删自己的那条", () => {
    permissionState.canManage = false;

    const { rerender } = render(
      <ErrorLogSheet
        open
        onOpenChange={vi.fn()}
        log={createMockErrorLog({ user_id: "someone-else" })}
        allowDelete
      />,
      { wrapper },
    );

    expect(
      screen.queryByRole("button", { name: "删除" }),
    ).not.toBeInTheDocument();

    rerender(
      <ErrorLogSheet
        open
        onOpenChange={vi.fn()}
        log={createMockErrorLog({ user_id: "user1" })}
        allowDelete
      />,
    );

    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
  });

  it("未开启 allowDelete 时不给删除入口", () => {
    // 平台控制台复用同一个抽屉，但删除走的是租户接口，平台管理员令牌打不进去。
    render(
      <ErrorLogSheet open onOpenChange={vi.fn()} log={createMockErrorLog()} />,
      { wrapper },
    );

    expect(
      screen.queryByRole("button", { name: "删除" }),
    ).not.toBeInTheDocument();
  });
});
