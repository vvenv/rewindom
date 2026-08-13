import { createQueryWrapper, createTestQueryClient } from "@rewindom/client-test";
import { server } from "@rewindom/client-test/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";

import type { TenantUserListItem } from "@rewindom/shared";

import { UserCreateSheet, UserEditSheet } from "./UserSheet.js";

const mockUser: TenantUserListItem = {
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

describe("UserSheet", () => {
  const wrapper = createQueryWrapper(createTestQueryClient());

  it("新建用户时应显示添加标题", () => {
    render(<UserCreateSheet />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "新建用户" }));

    expect(
      screen.getByRole("heading", { name: "新建用户" }),
    ).toBeInTheDocument();
  });

  it("编辑用户时应显示用户名", () => {
    render(<UserEditSheet user={mockUser} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));

    expect(screen.getByText("编辑用户")).toBeInTheDocument();
    expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
  });

  it("提交新建用户应真实调用 POST /api/users", async () => {
    server.use(
      http.post("/api/users", async ({ request }) => {
        const body = (await request.json()) as { username: string };
        return HttpResponse.json({
          data: {
            ...mockUser,
            id: "new-user",
            username: body.username,
          },
        });
      }),
    );

    render(<UserCreateSheet />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "新建用户" }));

    fireEvent.change(screen.getByLabelText(/账号/), {
      target: { value: "newuser" },
    });
    fireEvent.change(screen.getByLabelText(/密码/, { exact: false }), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "新建用户" }),
      ).not.toBeInTheDocument();
    });
  });
});
