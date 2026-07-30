import { Suspense } from "react";

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { renderAppShellRoutes } from "./app-shell-routes";

import type { AppRouteTrees } from "./collect-modules";

const trees: AppRouteTrees = {
  publicRoutes: <Route path="/" element={<p>官网落地页</p>} />,
  guestRoutes: <Route path="/login" element={<p>登录</p>} />,
  tenantRoutes: <Route path="/notes" element={<p>笔记</p>} />,
  superUserRoutes: null,
  platformRoutes: null,
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={null}>
        <Routes>{renderAppShellRoutes(trees)}</Routes>
      </Suspense>
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
