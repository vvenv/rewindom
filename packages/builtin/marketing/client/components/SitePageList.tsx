import { EmptyState } from "@be-water/client-kit";
import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Button } from "@be-water/ui/button";
import { Skeleton } from "@be-water/ui/skeleton";
import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";

import { canMoveSitePageGroup } from "../lib/site-page-order.js";

import { SitePageGroupRow } from "./SitePageGroupRow.js";

import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { SitePageGroup } from "../lib/site-page-groups.js";
import type { AppLocale } from "@be-water/shared";

/** 骨架行数：铺满首屏一屏内的常见页面数即可。 */
const SKELETON_COUNT = 3;

interface SitePageListProps {
  /** 已按筛选裁剪过的组；排序仍针对全量（见 `allGroups`）。 */
  groups: SitePageGroup[];
  /**
   * 未经筛选的全量组，按站点顺序。
   *
   * 上下移算的是**它**里面的位置：筛出三行后点「下移」，若按可见列表算，页面会跳到
   * 一个屏幕上根本没显示的位置去。也因此筛选中不给排序入口（见 `orderable`）。
   */
  allGroups: SitePageGroup[];
  defaultLocale: AppLocale;
  canWrite: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  /** 有筛选条件时空态换成「没有匹配结果」，并且不给排序入口。 */
  isFiltered: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  actions: SitePageActions;
}

/**
 * 站点卡片的正文：加载 / 失败 / 空态 / 列表四种形态都收在这里。
 * 卡片提供外框，所以这里只画分隔线，行自带左右内边距铺满整宽。
 */
export function SitePageList({
  groups,
  allGroups,
  defaultLocale,
  canWrite,
  isLoading,
  isError,
  error,
  isFiltered,
  onRetry,
  onResetFilters,
  actions,
}: SitePageListProps) {
  const { t } = useTranslation("marketing");

  if (isLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-4 py-3"
          >
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {error?.message || t("cms.loadFailed")}
          </AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("common:retry")}
        </Button>
      </div>
    );
  }

  if (groups.length === 0) {
    if (isFiltered) {
      return (
        <EmptyState
          icon={SearchX}
          title={t("cms.emptyFiltered")}
          description={t("cms.emptyFilteredHint")}
          action={
            <Button variant="outline" size="sm" onClick={onResetFilters}>
              {t("common:reset")}
            </Button>
          }
        />
      );
    }
    /*
     * 自定义页为空是常态：首页 / 文档版式等模板页在下方常驻，且多数自带默认版式。
     * 这里再画「还没有页面」会让人以为站点一片空白。
     */
    return null;
  }

  // 筛选中不给排序：可见的先后与真实先后不是一回事，点下去等于盲排
  const orderable = canWrite && !isFiltered && allGroups.length > 1;

  return (
    <div className="divide-y">
      {groups.map((group, index) => (
        <SitePageGroupRow
          key={`${group.kind}:${group.slug}`}
          group={group}
          defaultLocale={defaultLocale}
          canWrite={canWrite}
          actions={actions}
          order={
            orderable
              ? {
                  canMoveUp: canMoveSitePageGroup(allGroups, index, -1),
                  canMoveDown: canMoveSitePageGroup(allGroups, index, 1),
                  pending: actions.reorderPending,
                  onMove: (direction) =>
                    actions.move(allGroups, index, direction),
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
