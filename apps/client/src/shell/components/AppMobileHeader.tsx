import { resolveNavLabel } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import { ChevronLeft, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";

import { useAppShellConfig } from "../contexts/app-shell-context.js";

import { ShellSlotList } from "./ShellSlotList.js";

export function AppMobileHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const { t } = useTranslation("shell");
  const location = useLocation();
  const navigate = useNavigate();
  const { resolveMobileHeaderState, shellContributions } = useAppShellConfig();
  const { title, back } = resolveMobileHeaderState(location.pathname);
  // nav / mobileHeaderRoutes 存的是 `namespace:key`，与侧栏一致在渲染时解析
  const resolvedTitle = resolveNavLabel(title, t);
  const resolvedBackLabel = back
    ? resolveNavLabel(back.label, t)
    : undefined;

  return (
    <header className="safe-area-inset-top z-40 flex h-14 shrink-0 items-center gap-1.5 border-b border-border/50 bg-card px-3 md:hidden">
      {back ? (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => navigate(back.to)}
          aria-label={resolvedBackLabel}
        >
          <ChevronLeft className="size-5" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onOpenNav}
          aria-label={t("chrome.openNav")}
        >
          <Menu className="size-5" />
        </Button>
      )}
      <h1 className="min-w-0 flex-1 truncate font-medium text-foreground">
        {resolvedTitle}
      </h1>
      <ShellSlotList
        components={shellContributions.mobileHeaderTrailing}
        render={(Component, index) => <Component key={index} />}
      />
    </header>
  );
}
