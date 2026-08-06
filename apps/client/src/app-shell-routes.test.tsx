import { Suspense } from "react";

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { AppShellConfigProvider, buildAppShellConfig } from "./app-shell-config";
import { renderAppShellRoutes } from "./app-shell-routes";

import type { AppRouteTrees } from "./collect-modules";

const trees: AppRouteTrees = {
  publicRoutes: <Route path="/" element={<p>官网落地页</p>} />,
  guestRoutes: <Route path="/login" element={<p>登录</p>} />,
  tenantRoutes: <Route path="/notes" element={<p>笔记</p>} />,
  superUserRoutes: null,
  platformRoutes: null,
};

/**
 * 公开路由外面套的是 `PublicProviders`（模块贡献的 `publicProviders`，如站点会员
 * 会话），它要读外壳配置——`App.tsx` 里 `AppShellConfigProvider` 恒在 `Routes` 外层，
 * 所以这里也照着给一份空配置。要验的是「没有 **Auth** Provider 也能渲染」。
 */
const shellConfig = buildAppShellConfig([]);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShellConfigProvider value={shellConfig}>
        <Suspense fallback={null}>
          <Routes>{renderAppShellRoutes(trees)}</Routes>
        </Suspense>
      </AppShellConfigProvider>
    </MemoryRouter>,
  );
}

describe("renderAppShellRoutes", () => {
  /**
   * 没有 AuthProvider 也能渲染出内容，就说明公开路由确实没套守卫——
   * 守卫里的 `useAuth` 一旦被触达会直接抛。这也是预渲染能跑通的前提。
   */
  it("renders public routes with no guard and no auth provider", () => {
    renderAt("/");

    expect(screen.getByText("官网落地页")).toBeInTheDocument();
  });

  it("still guards tenant routes", () => {
    expect(() => renderAt("/notes")).toThrow(/AuthProvider/u);
  });

  it("still guards guest-only routes", () => {
    expect(() => renderAt("/login")).toThrow(/AuthProvider/u);
  });
});
