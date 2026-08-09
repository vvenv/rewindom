import { Suspense } from "react";

import { Toaster } from "@be-water/ui/sonner";
import { Spinner } from "@be-water/ui/spinner";
import { BrowserRouter, Route, Routes } from "react-router";

import { AppShellConfigProvider } from "@/app-shell-config";
import { ENABLED_CLIENT_MODULES } from "@/enabled-modules";
import { prepareAppRoutes, renderAppRoutes } from "@/render-app-routes";
import { AppNotFoundRedirect } from "@/shell/index";

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

export function App() {
  const appShellConfig = prepareAppRoutes(ENABLED_CLIENT_MODULES);

  // RR 8 默认把 location 更新包进 startTransition，列表筛选项的 URL 写入会被
  // 并发渲染推迟/打断（chip 偶发不刷新、重置「无效」）。管理台要即时 URL 状态。
  return (
    <BrowserRouter useTransitions={false}>
      <AppShellConfigProvider value={appShellConfig}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {renderAppRoutes(ENABLED_CLIENT_MODULES)}
            <Route path="*" element={<AppNotFoundRedirect />} />
          </Routes>
        </Suspense>
      </AppShellConfigProvider>
      <Toaster position="bottom-left" />
    </BrowserRouter>
  );
}
