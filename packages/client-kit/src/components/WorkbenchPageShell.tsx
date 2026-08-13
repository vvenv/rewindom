import type { ReactNode } from "react";

import { Button } from "@rewindom/ui/button";
import { Card, CardContent } from "@rewindom/ui/card";
import { cn } from "@rewindom/ui/utils";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export function WorkbenchPageShell({
  children,
  className,
  fill,
}: {
  children: ReactNode;
  className?: string;
  /**
   * 让内容撑满外壳可用高度（页面自身不滚，由内部分区各自滚）。
   * 只在 lg+ 生效：窄屏列会堆叠，锁死高度反而挤没内容。
   */
  fill?: boolean;
}) {
  return (
    <div className={cn("min-h-full bg-background", fill && "lg:h-full")}>
      <div
        className={cn(
          // Mobile: AppMobileHeader already provides title + separator; keep top inset minimal.
          "mx-auto flex w-full flex-col gap-4 p-4 md:gap-6 md:px-8 md:py-8",
          fill && "lg:h-full lg:min-h-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function PageBackLink({
  to,
  label,
  className,
}: {
  to: string;
  label: string;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "-ml-2 h-8 w-fit gap-1.5 px-2 text-muted-foreground hover:text-foreground",
        className,
      )}
      asChild
    >
      <Link to={to}>
        <ArrowLeft className="size-4 shrink-0" />
        {label}
      </Link>
    </Button>
  );
}

export function PageSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Shared width for workbench create/upload form panels (Card + inner form). */
export const WORKBENCH_FORM_PANEL_CLASS = "surface-panel w-full max-w-2xl";

export function WorkbenchFormPanel({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn(WORKBENCH_FORM_PANEL_CLASS, className)}>
      <CardContent className={cn("w-full", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
