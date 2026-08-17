import { EmptyState, Pagination } from "@rewindom/module-sdk/client";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import { Card, CardContent, CardHeader } from "@rewindom/ui/card";
import { Skeleton } from "@rewindom/ui/skeleton";
import { Radar } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EventCard } from "./EventCard.js";

import type { EventListResult } from "../../shared/index.js";

const SKELETON_COUNT = 6;
const GRID_CLASS = "grid gap-3 md:grid-cols-2 xl:grid-cols-3";

interface EventListProps {
  data?: EventListResult;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  hasFilters: boolean;
  onRetry: () => void;
}

export function EventList({
  data,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  hasFilters,
  onRetry,
}: EventListProps) {
  const { t } = useTranslation("events");

  if (isLoading) {
    return <EventListSkeleton />;
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

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Radar}
        title={hasFilters ? t("empty.filteredTitle") : t("empty.title")}
        description={
          hasFilters ? t("empty.filteredDescription") : t("empty.description")
        }
      />
    );
  }

  const total = data?.total ?? 0;
  const pageCount = data?.page_count ?? Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className={GRID_CLASS}>
        {items.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      <Pagination
        currentPage={page}
        pageCount={pageCount}
        pageSize={pageSize}
        total={total}
        canPrev={page > 1}
        canNext={page < pageCount}
      />
    </div>
  );
}

function EventListSkeleton() {
  return (
    <div className={GRID_CLASS} aria-hidden>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Card key={index}>
          <CardHeader className="gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
