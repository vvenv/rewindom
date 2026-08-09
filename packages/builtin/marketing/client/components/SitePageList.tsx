import { EmptyState } from "@be-water/client-kit";
import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Button } from "@be-water/ui/button";
import { Skeleton } from "@be-water/ui/skeleton";
import { FileText, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SitePageCreateSheet } from "./SitePageCreateSheet.js";
import { SitePageGroupRow } from "./SitePageGroupRow.js";

import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { SitePageGroup } from "../lib/site-page-groups.js";
import type { AppLocale } from "@be-water/shared";

/** 骨架行数：铺满首屏一屏内的常见页面数即可。 */
const SKELETON_COUNT = 3;

interface SitePageListProps {
  groups: SitePageGroup[];
  defaultLocale: AppLocale;
  canWrite: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  actions: SitePageActions;
}

/**
 * 站点卡片的正文：加载 / 失败 / 空态 / 列表四种形态都收在这里。
 * 卡片提供外框，所以这里只画分隔线，行自带左右内边距铺满整宽。
 */
export function SitePageList({
  groups,
  defaultLocale,
  canWrite,
  isLoading,
  isError,
  error,
  onRetry,
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
    return (
      <EmptyState
        icon={FileText}
        title={t("cms.empty")}
        description={t("cms.emptyHint")}
        action={
          canWrite ? (
            <SitePageCreateSheet>
              <Button size="sm">
                <Plus className="size-4" />
                {t("cms.create")}
              </Button>
            </SitePageCreateSheet>
          ) : null
        }
      />
    );
  }

  return (
    <div className="divide-y">
      {groups.map((group) => (
        <SitePageGroupRow
          key={`${group.kind}:${group.slug}`}
          group={group}
          defaultLocale={defaultLocale}
          canWrite={canWrite}
          actions={actions}
        />
      ))}
    </div>
  );
}
