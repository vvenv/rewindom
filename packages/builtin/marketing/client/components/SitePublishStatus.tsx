import type { ReactElement } from "react";

import { cn } from "@be-water/ui/utils";
import { useTranslation } from "react-i18next";

/**
 * 状态点 + 文案：草稿灰、已发布绿、已发布但草稿更新过用琥珀色。
 *
 * 页面列表与文档库列表共用同一套语义（draft / published / dirty），共用同一个
 * 渲染——两处各画一遍的话，改了颜色只会改到其中一处。
 */
export function SitePublishStatus({
  status,
  contentDirty,
  className,
  labelClassName,
}: {
  status: "draft" | "published";
  contentDirty: boolean;
  className?: string;
  /** 窄屏想把文案挤掉时传 `sr-only sm:not-sr-only`（页面列表那种紧凑行）。 */
  labelClassName?: string;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const published = status === "published";
  const dirty = published && contentDirty;
  const label = dirty
    ? t("cms.statusDirty")
    : published
      ? t("cms.statusPublished")
      : t("cms.statusDraft");

  return (
    <span
      className={cn("flex items-center gap-1.5", className)}
      title={dirty ? t("cms.statusDirtyHint") : undefined}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          dirty
            ? "bg-amber-500"
            : published
              ? "bg-emerald-500"
              : "bg-muted-foreground/40",
        )}
      />
      {/* 文案在窄屏可以只留给屏幕阅读器，两种宽度下无障碍树里读到的一样 */}
      <span
        className={cn("truncate text-xs text-muted-foreground", labelClassName)}
      >
        {label}
      </span>
    </span>
  );
}
