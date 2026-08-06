import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TenantCustomPage } from "./tenant-custom-page.js";

import type { PublicConfig } from "@be-water/shared";

let config: Partial<PublicConfig>;
let isSuccess: boolean;

vi.mock("@be-water/client-kit", async () => {
  const actual =
    await vi.importActual<typeof import("@be-water/client-kit")>(
      "@be-water/client-kit",
    );
  return {
    ...actual,
    usePublicConfig: () => ({
      data: { bound_tenant: null, ...config },
      isSuccess,
    }),
  };
});

// 站点抓取要发请求，这里只关心「渲不渲染站点」这一层
vi.mock("../components/TenantSitePageGate.js", () => ({
  TenantSitePageGate: () => <p>site gate</p>,
}));

function renderAt(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<TenantCustomPage />} />
        <Route path="/platform" element={<p>platform console</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  config = {};
  isSuccess = true;
});

describe("TenantCustomPage", () => {
  it("绑定了租户就渲染站点", () => {
    config = {
      bound_tenant: {
        slug: "acme",
        name: "Acme",
        logo_url: null,
        favicon_url: null,
      },
    };
    renderAt();
    expect(screen.getByText("site gate")).toBeInTheDocument();
  });

  /*
   * 平台控制台 Host（PLATFORM_URL / 本地 127.0.0.1）没有绑定租户。
   * 以前这里渲染「Site unavailable」，平台管理员打开控制台域名就是死路一条，
   * 得自己猜出要手敲 /platform 或 /login。
   */
  it("没有绑定租户的 Host 交给控制台入口", () => {
    config = { bound_tenant: null };
    renderAt();
    expect(screen.getByText("platform console")).toBeInTheDocument();
    expect(screen.queryByText("site gate")).toBeNull();
  });

  // `bound_tenant` 加载中的默认值也是 null，抢跑会把租户站一起弹走
  it("配置还没回来时不抢跑", () => {
    isSuccess = false;
    config = { bound_tenant: null };
    renderAt();
    expect(screen.getByText("site gate")).toBeInTheDocument();
    expect(screen.queryByText("platform console")).toBeNull();
  });

  // 陌生 Host 同样没有租户，但不该把控制台登录页递给它
  it("非控制台 origin 的未绑定 Host 仍显示站点不可用", () => {
    config = { bound_tenant: null, platform_url: "https://console.example.com" };
    renderAt();
    expect(screen.getByText("site gate")).toBeInTheDocument();
    expect(screen.queryByText("platform console")).toBeNull();
  });
});
