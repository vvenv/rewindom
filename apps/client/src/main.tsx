import { StrictMode } from "react";

import {
  AuthProvider,
  ConfirmProvider,
  ConfirmDialog,
  ErrorBoundary,
} from "@be-water/client-kit";
import { clearImpersonationBackup } from "@be-water/modules/platform/client/lib/impersonation-storage.js";
import { TooltipProvider } from "@be-water/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false,
    },
  },
});

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
                <App />
              </AuthProvider>
              <ConfirmDialog />
            </ConfirmProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
