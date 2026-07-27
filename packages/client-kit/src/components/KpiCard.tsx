import type { ComponentProps, ReactNode } from "react";


import { Card, CardContent } from "@be-water/ui/card";
import { cn } from "@be-water/ui/utils";
import { ArrowRight } from "lucide-react";

/**
 * 全站统一的 KPI / 指标卡片。
 *
 * 所有租户页面的统计卡片都应使用该组件，
 * 以保证大小、布局、字体、配色的一致性。若需要更紧凑的行内统计条，使用 `size="sm"`。
 */
export type KpiVariant = "default" | "danger" | "warning" | "info" | "success";

const VARIANT_STYLES: Record<KpiVariant, { value: string; accent: string }> = {
  default: { value: "text-foreground", accent: "bg-primary" },
  danger: { value: "text-destructive", accent: "bg-destructive" },
  warning: { value: "text-warning", accent: "bg-warning" },
  info: { value: "text-info", accent: "bg-info" },
  success: { value: "text-success", accent: "bg-success" },
};

export interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  variant?: KpiVariant;
  /** `default` 为标准指标卡，`sm` 为面板内的紧凑统计条。 */
  size?: "default" | "sm";
  /** 是否显示顶部的彩色强调条，默认显示。 */
  accent?: boolean;
  /** 提供后卡片渲染为按钮（通常用于跳转到筛选后的列表）。 */
  onClick?: () => void;
  /** 当对应筛选处于激活状态时高亮卡片（仅在可点击时有意义）。 */
  active?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  sub,
  variant = "default",
  size = "default",
  accent = true,
  onClick,
  active = false,
  className,
}: KpiCardProps) {
  const styles = VARIANT_STYLES[variant];
  const interactive = Boolean(onClick);
  const sm = size === "sm";

  const card = (
    <Card
      size={sm ? "sm" : "default"}
      className={cn(
        "surface-kpi relative h-full overflow-hidden transition-colors",
        interactive && "group-hover:bg-muted/40",
        active && "ring-2 ring-brand/40",
        className,
      )}
    >
      {accent ? (
        <span
          aria-hidden
          className={cn("absolute inset-x-0 top-0 h-1", styles.accent)}
        />
      ) : null}
      <CardContent className={cn(sm ? "space-y-0.5 pt-1" : "space-y-1")}>
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "min-w-0 truncate text-muted-foreground",
              sm ? "text-xs" : "text-sm font-medium",
            )}
          >
            {label}
          </p>
          {interactive && !sm ? (
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          ) : null}
        </div>
        <p
          className={cn(
            "tabular-nums tracking-tight",
            sm ? "text-2xl font-semibold" : "text-3xl font-bold",
            styles.value,
          )}
        >
          {value}
        </p>
        {sub ? (
          <p
            className={cn(
              "truncate text-muted-foreground",
              sm ? "text-[11px]" : "text-xs",
            )}
          >
            {sub}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!interactive) {
    return <div className="min-w-0">{card}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full min-w-0 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {card}
    </button>
  );
}

/** 标准 KPI 卡片栅格：默认两列（移动端）/ 四列（桌面端），间距统一。 */
export function KpiCardGrid({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}
      {...props}
    />
  );
}
