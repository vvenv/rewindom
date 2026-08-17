import { useCallback, useState } from "react";

import {
  ApiError,
  EmptyState,
  useConfirm,
  usePermissions,
} from "@rewindom/module-sdk/client";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import { Switch } from "@rewindom/ui/switch";
import { toast } from "@rewindom/ui/toast";
import { Rss } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useDeleteEventFeed,
  useUpdateEventFeed,
} from "../hooks/useEventFeedMutations.js";

import { EventFeedEditSheet } from "./EventFeedEditSheet.js";
import { RelativeTime } from "./RelativeTime.js";

import type { EventFeedItem } from "../../shared/index.js";

interface EventFeedListProps {
  feeds: EventFeedItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function EventFeedList({
  feeds,
  isLoading,
  isError,
  error,
  onRetry,
}: EventFeedListProps) {
  const { t } = useTranslation("events");
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("events.write");
  const deleteMutation = useDeleteEventFeed();
  const updateMutation = useUpdateEventFeed();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (feed: EventFeedItem, enabled: boolean) => {
      setPendingId(feed.id);
      try {
        await updateMutation.mutateAsync({ feedId: feed.id, enabled });
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : t("sources.updateFailed"),
        );
      } finally {
        setPendingId(null);
      }
    },
    [t, updateMutation],
  );

  const handleDelete = useCallback(
    async (feed: EventFeedItem) => {
      const confirmed = await confirm({
        title: t("sources.deleteConfirmTitle"),
        description: t("sources.deleteConfirmDescription", { name: feed.name }),
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
      setPendingId(feed.id);
      try {
        await deleteMutation.mutateAsync(feed.id);
        toast.success(t("sources.toastDeleted"));
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : t("sources.deleteFailed"),
        );
      } finally {
        setPendingId(null);
      }
    },
    [confirm, deleteMutation, t],
  );

  if (isLoading && feeds.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t("sources.loading")}</p>
    );
  }

  if (isError && feeds.length === 0) {
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

  if (feeds.length === 0) {
    return (
      <EmptyState
        icon={Rss}
        title={t("sources.emptyTitle")}
        description={t("sources.emptyDescription")}
      />
    );
  }

  return (
    <ul className="divide-border divide-y rounded-lg border">
      {feeds.map((feed) => {
        const busy = pendingId === feed.id;
        return (
          <li
            key={feed.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{feed.name}</p>
                <span className="text-muted-foreground text-xs">
                  {t(`sourceKind.${feed.source_kind}`)} · {t(`topic.${feed.topic}`)}
                </span>
              </div>
              <p className="text-muted-foreground truncate text-xs">{feed.url}</p>
              {feed.last_error ? (
                <p className="text-destructive text-xs">{feed.last_error}</p>
              ) : feed.last_fetched_at ? (
                <p className="text-muted-foreground text-xs">
                  {t("sources.lastFetched")}{" "}
                  <RelativeTime iso={feed.last_fetched_at} />
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {t("sources.neverFetched")}
                </p>
              )}
            </div>
            {canWrite ? (
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={feed.enabled}
                  disabled={busy}
                  onCheckedChange={(enabled) => void handleToggle(feed, enabled)}
                  aria-label={t("sources.enabledAriaLabel", { name: feed.name })}
                />
                <EventFeedEditSheet feed={feed} />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleDelete(feed)}
                >
                  {t("sources.delete")}
                </Button>
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">
                {feed.enabled ? t("sources.enabled") : t("sources.disabled")}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
