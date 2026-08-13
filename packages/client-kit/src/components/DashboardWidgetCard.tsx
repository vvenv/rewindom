import type { ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rewindom/ui/card";
import { Skeleton } from "@rewindom/ui/skeleton";
import { ArrowRight, type LucideIcon  } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";


/**
 * 工作台卡片的统一外壳：标题行（图标 + 标题 + 「查看全部」）+ 内容区的
 * 加载/失败/空三态。
 *
 * 卡片由各业务模块自己写，但**外观必须一致**——栅格里十几张卡片各自手写
 * Card/Header/Skeleton 的结果就是行高、留白、空态文案各不相同。业务模块只管
 * 把数据渲染进 `children`。
 *
 * 文案一律由调用方传入 `namespace:key` 解析后的字符串；这里只对三态兜底文案
 * 回落到 `common`。
 */
export interface DashboardWidgetCardProps {
  icon: LucideIcon;
  title: ReactNode;
  /** 「查看全部」的目标路由；不传则不渲染该入口。 */
  to?: string;
  viewAllLabel?: ReactNode;
  /** 标题右侧的自定义内容（如未读数徽标）；与 `to` 同时存在时排在其左边。 */
  headerExtra?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  errorText?: ReactNode;
  /** 数据为空。为 true 时渲染 `emptyText` 而不是 `children`。 */
  isEmpty?: boolean;
  emptyText?: ReactNode;
  children?: ReactNode;
}

export function DashboardWidgetCard({
  icon: Icon,
  title,
  to,
  viewAllLabel,
  headerExtra,
  isLoading,
  isError,
  errorText,
  isEmpty,
  emptyText,
  children,
}: DashboardWidgetCardProps) {
  const { t } = useTranslation("common");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
        {headerExtra || to ? (
          <CardAction className="flex items-center gap-2">
            {headerExtra}
            {to ? (
              <Link
                to={to}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                {viewAllLabel ?? t("more")}
                <ArrowRight className="size-3.5" />
              </Link>
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            {errorText ?? t("loadFailed")}
          </p>
        ) : isEmpty ? (
          <p className="text-sm text-muted-foreground">
            {emptyText ?? t("noData")}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/** 卡片内的一行「主文案 + 右侧次要信息」，列表型卡片统一用它。 */
export function DashboardWidgetRow({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="min-w-0 flex-1 truncate">{primary}</span>
      {secondary ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          {secondary}
        </span>
      ) : null}
    </li>
  );
}

export function DashboardWidgetList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-2">{children}</ul>;
}
