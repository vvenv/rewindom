import { StrictMode } from "react";

import { clearImpersonationBackup } from "@rewindom/builtin/platform/client/lib/impersonation-storage.js";
import {
  AuthProvider,
  ConfirmProvider,
  ConfirmDialog,
  ErrorBoundary,
  LocaleProvider,
  collectClientI18nBundles,
  readStoredAppLocale,
  registerI18nBundles,
  setApiAcceptLanguage,
  setupI18n,
} from "@rewindom/client-kit";
import { TooltipProvider } from "@rewindom/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";
import { ENABLED_CLIENT_MODULES } from "./enabled-modules.ts";
import { loadInitialShellCss } from "./load-shell-css.ts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false,
    },
  },
});

async function boot(): Promise<void> {
  registerI18nBundles(collectClientI18nBundles(ENABLED_CLIENT_MODULES));
  const bootLocale = readStoredAppLocale();
  setupI18n(bootLocale);
  setApiAcceptLanguage(bootLocale);
  document.documentElement.lang = bootLocale;

  await loadInitialShellCss();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="theme"
        themes={["light", "dark", "system"]}
      >
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <ConfirmProvider>
                <AuthProvider onLogout={clearImpersonationBackup}>
                  <LocaleProvider>
                    <App />
                  </LocaleProvider>
                </AuthProvider>
                <ConfirmDialog />
              </ConfirmProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </StrictMode>,
  );
}

void boot();
