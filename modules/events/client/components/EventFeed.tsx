import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import { Skeleton } from "@rewindom/ui/skeleton";
import { useTranslation } from "react-i18next";

import { EventFeedSection } from "./EventFeedSection.js";

import type { EventFeedResult } from "../../shared/index.js";

/**
 * 首页三个区块（MVP §14）。
 *
 * 区块的先后顺序就是产品主张：先看**正在变化**的（Rising），再看正在发生的（Now），
 * 最后才是今天的全量（Today）。反过来排就又变成一份普通榜单了。
 */
export function EventFeed({
  data,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  data?: EventFeedResult;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation("events");

  if (isLoading) {
    return <EventFeedSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {error instanceof Error ? error.message : t("loadFailed")}
          </AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <EventFeedSection
        title={t("sections.rising")}
        hint={t("sections.risingHint")}
        events={data?.rising ?? []}
        emptyLabel={t("empty.title")}
      />
      <EventFeedSection
        title={t("sections.now")}
        hint={t("sections.nowHint")}
        events={data?.now ?? []}
        emptyLabel={t("empty.title")}
      />
      <EventFeedSection
        title={t("sections.today")}
        hint={t("sections.todayHint")}
        meta={t("sections.todayCount", { count: data?.today_total ?? 0 })}
        events={data?.today ?? []}
        emptyLabel={t("empty.title")}
      />
    </div>
  );
}

function EventFeedSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      {Array.from({ length: 3 }, (_, section) => (
        <div key={section} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, card) => (
              <Skeleton key={card} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
