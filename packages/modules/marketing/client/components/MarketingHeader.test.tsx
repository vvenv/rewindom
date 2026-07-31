import {
  AuthContext,
  registerI18nBundles,
  setupI18n,
  type AuthContextType,
} from "@be-water/client-kit";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { MARKETING_I18N } from "../i18n.js";
import { MarketingHeader } from "./MarketingHeader.js";

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

function renderHeader(auth?: Partial<AuthContextType>) {
  const ui = (
    <MemoryRouter initialEntries={["/"]}>
      <MarketingHeader />
    </MemoryRouter>
  );

  return render(
    auth ? (
      <AuthContext.Provider value={auth as AuthContextType}>
        {ui}
      </AuthContext.Provider>
    ) : (
      ui
    ),
  );
}

describe("MarketingHeader", () => {
  /**
   * 没有 AuthProvider 也必须渲染出来——预渲染就是这个环境。
   * 用 `useAuth` 的话这里会直接抛。
   */
  it("renders for a visitor with no auth provider at all", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "登录" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("link", { name: "免费开始" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.queryByText("进入控制台")).not.toBeInTheDocument();
  });

  it("keeps showing the guest CTA while the session is still unknown", () => {
    renderHeader({ isAuthenticated: false, isLoading: true });

    expect(screen.getByRole("link", { name: "登录" })).toBeInTheDocument();
  });

  it("swaps in the console entry once authenticated", () => {
    renderHeader({ isAuthenticated: true, isLoading: false });

    expect(screen.getByRole("link", { name: "进入控制台" })).toHaveAttribute(
      "href",
      "/app",
    );
    expect(screen.queryByText("登录")).not.toBeInTheDocument();
  });

  it("always exposes the docs and pricing nav links", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "文档" })).toHaveAttribute(
      "href",
      "/docs",
    );
    expect(screen.getByRole("link", { name: "定价" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });
});
