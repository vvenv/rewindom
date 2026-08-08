import { createQueryWrapper, createTestQueryClient } from "@be-water/client-test";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import type { TenantUserListItem } from "@be-water/shared";

import { UserResetPasswordSheet } from "./UserResetPasswordSheet.js";

const user: TenantUserListItem = {
  id: "user1",
  username: "testuser",
  is_system_admin: false,
  enabled: true,
  roles: [],
  last_login_at: null,
  last_access_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  failed_login_attempts: 0,
  locked_until: null,
};

describe("UserResetPasswordSheet", () => {
  const wrapper = createQueryWrapper(createTestQueryClient());

  it("应该显示重置密码标题", () => {
    render(<UserResetPasswordSheet user={user} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "重置密码" }));

    expect(screen.getByText("重置密码")).toBeInTheDocument();
    expect(screen.getByText(/testuser/)).toBeInTheDocument();
  });

  it("应该显示新密码输入框", () => {
    render(<UserResetPasswordSheet user={user} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "重置密码" }));

    expect(screen.getByLabelText("新密码")).toBeInTheDocument();
  });
});
