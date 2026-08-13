import { Suspense, useEffect, useState, type ReactNode } from "react";

import {
  NavBadgeRegistryProvider,
  ShellLayoutProvider,
  ThemePaletteProvider,
  useAuth,
  useMediaQuery,
  useShellLayout,
} from "@rewindom/client-kit";
import { Spinner } from "@rewindom/ui/spinner";
import { cn } from "@rewindom/ui/utils";
import { Outlet, useNavigate } from "react-router";

import { useAppShellConfig } from "../contexts/app-shell-context.js";

import { AppMobileHeader } from "./AppMobileHeader.js";
import { ShellProviders } from "./ShellProviders.js";
import { ShellSlotList } from "./ShellSlotList.js";
import { DesktopSidebar, MobileNavDrawer, MobileTabBar } from "./Sidebar.js";
import { TopBar } from "./TopBar.js";

function NavBadgeContributors(): ReactNode {
  const { shellContributions } = useAppShellConfig();

  return (
    <ShellSlotList
      components={shellContributions.navBadge}
      render={(Component, index) => <Component key={index} />}
    />
  );
}

function AppMain({ impersonating }: { impersonating: boolean }) {
  return (
    <main
      className={cn(
        "flex-1 overflow-y-auto pb-16 md:pb-0",
        impersonating ? "bg-warning/5" : "",
      )}
    >
      {/*
        懒加载页面的 Suspense 边界必须在此处，不能只依赖 App 顶层那个：
        否则页面 chunk 未到时，顶层 fallback 会把**整棵树**（含已渲染的
        侧边栏）替换掉，表现为「侧边栏闪一下又消失、整屏再转一次圈」。
        放在 main 内，切换页面时外壳保持挂载，只有内容区显示加载态。
      */}
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </main>
  );
}

/**
 * 挑外壳骨架。布局偏好（左右 / 上下）**只在 md+ 生效**：窄屏一律走移动端外壳
 * （顶部标题栏 + 底部 tab bar + 抽屉导航），那套本就是为窄屏调优的。
 *
 * 判断放在渲染层而非 `ShellLayoutProvider` 里——偏好与生效条件分开，
 * 窗口缩到窄屏再拉回来不会丢用户选的布局。
 */
function AppShellFrame({
  impersonating,
  mobileNavOpen,
  onMobileNavOpenChange,
}: {
  impersonating: boolean;
  mobileNavOpen: boolean;
  onMobileNavOpenChange: (open: boolean) => void;
}) {
  const { layout } = useShellLayout();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const drawer = (
    <MobileNavDrawer
      open={mobileNavOpen}
      onOpenChange={onMobileNavOpenChange}
    />
  );

  if (!isMobile && layout === "topbar") {
    return (
      <div className="flex h-svh flex-col overflow-hidden bg-background">
        <TopBar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AppMain impersonating={impersonating} />
        </div>
        {drawer}
      </div>
    );
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {isMobile ? <MobileTabBar /> : <DesktopSidebar />}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppMobileHeader onOpenNav={() => onMobileNavOpenChange(true)} />
        <AppMain impersonating={impersonating} />
      </div>

      {drawer}
    </div>
  );
}

export function AppLayout() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { shellContributions } = useAppShellConfig();
  const impersonating = shellContributions.useImpersonationActive?.() ?? false;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  return (
    /*
      主题与布局都只作用于租户侧：两个 Provider 挂在这里，登录页与平台控制台
      因此恒定使用基础配色 + 左右布局。两者共用一次 /settings/appearance 查询。
    */
    <ThemePaletteProvider>
      <ShellLayoutProvider>
        <ShellProviders>
          {/* 徽标注册表要同时覆盖顶栏/侧边栏与移动端 tab bar，故提到骨架之外 */}
          <NavBadgeRegistryProvider>
            <NavBadgeContributors />
            <AppShellFrame
              impersonating={impersonating}
              mobileNavOpen={mobileNavOpen}
              onMobileNavOpenChange={setMobileNavOpen}
            />
          </NavBadgeRegistryProvider>
        </ShellProviders>
      </ShellLayoutProvider>
    </ThemePaletteProvider>
  );
}
