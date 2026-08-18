import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { enhanceAccount } from "./account.js";

describe("enhanceAccount", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("页头没有账户入口时不探测 /me", () => {
    document.body.innerHTML = "<header><nav>Home</nav></header>";
    enhanceAccount();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("已是登录菜单时不探测 /me", () => {
    document.body.innerHTML = `
      <details class="member-menu">
        <summary>Ada</summary>
        <button type="button" data-member-logout>退出登录</button>
      </details>
    `;
    enhanceAccount();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("有访客登录钮时才探测会话", () => {
    fetchMock.mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({}),
    });
    document.body.innerHTML =
      '<a class="btn btn-ghost member-entry" href="/member/login">登录</a>';
    enhanceAccount();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/member/me",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
