import { Suspense, useEffect, useState } from "react";

import { useAuth } from "@be-water/client-kit";
import { Spinner } from "@be-water/ui/spinner";
import { cn } from "@be-water/ui/utils";
import { Outlet, useNavigate } from "react-router";

import { useAppShellConfig } from "../contexts/app-shell-context.js";

import { AppMobileHeader } from "./AppMobileHeader.js";
import { ShellProviders } from "./ShellProviders.js";
import { MobileNavDrawer, Sidebar } from "./Sidebar.js";

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
    <ShellProviders>
      <div className="flex h-svh overflow-hidden bg-background">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppMobileHeader onOpenNav={() => setMobileNavOpen(true)} />
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
        </div>

        <MobileNavDrawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      </div>
    </ShellProviders>
  );
}
