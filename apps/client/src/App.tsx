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

  return (
    <BrowserRouter>
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
