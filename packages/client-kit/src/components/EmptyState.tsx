import type { ReactNode } from "react";

import { cn } from "@be-water/ui/utils";
import { useTranslation } from "react-i18next";

import type { LucideIcon } from "lucide-react";

/**
 * 空态尺寸：
 * - `page`：页面 / 卡片正文里的主空态，图标带圆形底色，留白足；
 * - `panel`：面板 / 抽屉 / 弹窗等窄容器里的空态，裸图标、留白收紧。
 */
export type EmptyStateSize = "page" | "panel";

interface EmptyStateProps {
  /** 传 lucide 图标组件本身（不要传元素），尺寸与配色由 EmptyState 统一。 */
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  /** 主动作按钮，如「新建」；无权限时传 null 即可。 */
  action?: ReactNode;
  size?: EmptyStateSize;
  className?: string;
}

/**
 * 全站统一空态：图标 + 标题 + 说明 + 可选动作。
 *
 * 表格空态由 DataTable 内部调用；非表格列表（卡片墙、面板、抽屉）直接用它，
 * 不要再手写 `flex flex-col items-center …` 的空态块，否则各页留白与字号会再次跑偏。
 * title / description 全省略时退化为 `common:noData`，保证任何调用都有可读文案。
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "page",
  className,
}: EmptyStateProps) {
  const { t } = useTranslation("common");
  const isPage = size === "page";
  const fallbackDescription =
    title == null && description == null ? t("noData") : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isPage ? "gap-4 py-16" : "gap-2 py-8",
        className,
      )}
    >
      {Icon ? (
        isPage ? (
          <div className="rounded-full bg-muted p-4">
            <Icon className="size-8 text-muted-foreground" />
          </div>
        ) : (
          <Icon className="size-8 text-muted-foreground" />
        )
      ) : null}
      <div className="space-y-1">
        {title == null ? null : <p className="text-sm font-medium">{title}</p>}
        {description == null && fallbackDescription == null ? null : (
          <p className="max-w-md text-sm text-muted-foreground">
            {description ?? fallbackDescription}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
