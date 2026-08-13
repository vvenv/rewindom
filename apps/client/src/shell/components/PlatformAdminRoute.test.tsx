import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlatformAdminRoute } from "./PlatformAdminRoute";

import type * as ClientKit from "@rewindom/client-kit";
import type { PublicConfig } from "@rewindom/shared";

type ClientKitModule = typeof ClientKit;

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  user: null as { actor_type: string } | null,
}));
const config = vi.hoisted(() => ({ value: {} as Partial<PublicConfig> }));
const assign = vi.hoisted(() => vi.fn());

vi.mock("@rewindom/client-kit", async () => {
  const actual =
    await vi.importActual<ClientKitModule>("@rewindom/client-kit");
  return {
    ...actual,
    useAuth: () => auth,
    useDefaultHomePath: () => "/app",
    usePublicConfig: () => ({
      data: { bound_tenant: null, platform_url: null, ...config.value },
    }),
  };
});

const TENANT = {
  slug: "default",
  name: "默认租户",
  logo_url: null,
  favicon_url: null,
};

function renderAt() {
  return render(
    <MemoryRouter initialEntries={["/platform"]}>
      <Routes>
        <Route element={<PlatformAdminRoute />}>
          <Route path="/platform" element={<p>console</p>} />
        </Route>
        <Route path="/" element={<p>tenant site</p>} />
        <Route path="/login" element={<p>login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.isAuthenticated = false;
  auth.isLoading = false;
  auth.user = null;
  config.value = {};
  vi.stubGlobal("location", {
    origin: "http://localhost:7300",
    assign,
    replace: assign,
  });
});

describe("PlatformAdminRoute", () => {
  /*
   * 租户 Host 上没有控制台。以前一律弹回官网首页，访问 `/platform` 的人只看到
   * 一张营销页，看起来就是「打不开」——而 `platform_url` 明明就在公开配置里。
   */
  it("租户 Host 上把人送去控制台那个 origin", () => {
    config.value = {
      bound_tenant: TENANT,
      platform_url: "http://127.0.0.1:7300",
    };
    renderAt();

    expect(assign).toHaveBeenCalledWith("http://127.0.0.1:7300/platform");
    expect(screen.queryByText("tenant site")).toBeNull();
  });

  // 没配 PLATFORM_URL = 控制台与应用同源，跳过去只会原地打转
  it("同源部署时退回首页而不是自跳", () => {
    config.value = { bound_tenant: TENANT, platform_url: null };
    renderAt();

    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByText("tenant site")).toBeInTheDocument();
  });

  it("控制台 Host 上未登录进登录页", () => {
    config.value = { bound_tenant: null, platform_url: "http://127.0.0.1:7300" };
    renderAt();

    expect(screen.getByText("login")).toBeInTheDocument();
  });

  it("控制台 Host 上平台管理员放行", () => {
    config.value = { bound_tenant: null, platform_url: "http://127.0.0.1:7300" };
    auth.isAuthenticated = true;
    auth.user = { actor_type: "platform_admin" };
    renderAt();

    expect(screen.getByText("console")).toBeInTheDocument();
  });
});
