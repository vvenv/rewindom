import {
  createQueryWrapper,
  createTestQueryClient,
} from "@be-water/client-test/react-query";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { createMockErrorLog } from "../test-fixtures.js";

import { ErrorLogSheet } from "./ErrorLogSheet.js";

vi.mock("@be-water/client-kit", () => ({
  useAuth: () => ({
    user: { id: "user1", is_system_admin: true },
  }),
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(false) }),
}));

vi.mock("../hooks/useDeleteErrorLog.js", () => ({
  useDeleteErrorLog: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("ErrorLogSheet", () => {
  const wrapper = createQueryWrapper(createTestQueryClient());

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

  it("系统管理员应显示删除按钮", () => {
    render(
      <ErrorLogSheet open onOpenChange={vi.fn()} log={createMockErrorLog()} />,
      { wrapper },
    );

    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
  });
});
