import { createQueryWrapper, createTestQueryClient } from "@rewindom/client-test";
import { server } from "@rewindom/client-test/server";
import { fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, it, expect } from "vitest";

import type { TenantUserListItem } from "@rewindom/shared";

import { UserPermissionSheet } from "./UserPermissionSheet.js";

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

describe("UserPermissionSheet", () => {
  const wrapper = createQueryWrapper(createTestQueryClient());

  beforeEach(() => {
    server.use(
      http.get("/api/users/user1/roles", () =>
        HttpResponse.json({
          data: {
            user: { id: "user1", username: "testuser", is_system_admin: false },
            roles: [{ id: "role-1", name: "编辑", description: null, scope: "tenant", is_builtin: false }],
          },
        }),
      ),
      http.get("/api/roles", () =>
        HttpResponse.json({
          data: [
            {
              id: "role-1",
              name: "编辑",
              description: null,
              scope: "tenant",
              is_builtin: false,
              permissions: ["orders.read"],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        }),
      ),
    );
  });

  it("应该显示角色分配标题", () => {
    render(<UserPermissionSheet user={user} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "分配角色" }));

    expect(screen.getByText("分配角色")).toBeInTheDocument();
    expect(screen.getByText(/testuser/)).toBeInTheDocument();
  });

  it("关闭时不渲染表单内容", () => {
    render(<UserPermissionSheet user={user} />, { wrapper });

    expect(
      screen.queryByText(/为用户 testuser 分配组织角色/),
    ).not.toBeInTheDocument();
  });
});
