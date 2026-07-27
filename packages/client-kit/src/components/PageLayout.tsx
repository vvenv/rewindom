import type { ReactNode } from "react";

import { cn } from "@be-water/ui/utils";

import {
  PageBackLink,
  WorkbenchPageShell,
} from "./WorkbenchPageShell";

import type { LucideIcon } from "lucide-react";

/** Mobile FAB / fixed actions: mount without occupying flex layout space. */
function PageLayoutMobileActions({ action }: { action: ReactNode }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 md:hidden [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
    >
      {action}
    </div>
  );
}

export function PageLayout({
  icon: Icon,
  title,
  description,
  action,
  backLink,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  backLink?: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <WorkbenchPageShell>
      {backLink ? (
        <PageBackLink
          to={backLink.to}
          label={backLink.label}
          className="hidden md:inline-flex"
        />
      ) : null}

      <header
        className={cn(
          "hidden flex-col gap-4 border-b pb-6 md:flex",
          backLink && "-mt-2",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          {action ? (
            <div className="flex shrink-0 items-center gap-2">{action}</div>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-4 md:gap-6">{children}</div>

      {action ? <PageLayoutMobileActions action={action} /> : null}
    </WorkbenchPageShell>
  );
}
