import { useCallback, useState } from "react";

import {
  ApiError,
  useConfirm,
  usePermissions,
} from "@rewindom/module-sdk/client";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import { Switch } from "@rewindom/ui/switch";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import {
  useDeleteEventFeed,
  useUpdateEventFeed,
} from "../hooks/useEventFeedMutations.js";
import {
  useEventTopicSettings,
  useUpdateEventTopicSettings,
} from "../hooks/useEventTopicSettings.js";
import { groupFeedsByTopic } from "../lib/event-feeds.js";

import { EventFeedEditSheet } from "./EventFeedEditSheet.js";
import { RelativeTime } from "./RelativeTime.js";
import { SourceIcon } from "./SourceIcon.js";

import {
  EVENT_TOPICS,
  isFeedCollecting,
  isTopicEnabled,
  type EventFeedItem,
  type EventTopic,
} from "../../shared/index.js";

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
  const topicsQuery = useEventTopicSettings();
  const updateTopics = useUpdateEventTopicSettings();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const enabledTopics = topicsQuery.data?.enabled_topics ?? EVENT_TOPICS;
  const groups = groupFeedsByTopic(feeds);

  const handleToggleFeed = useCallback(
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

  const handleToggleTopic = useCallback(
    async (topic: EventTopic, next: boolean) => {
      const nextEnabled = next
        ? EVENT_TOPICS.filter(
            (item) => item === topic || enabledTopics.includes(item),
          )
        : enabledTopics.filter((item) => item !== topic);
      if (nextEnabled.length === 0) {
        toast.error(t("sources.topicsNeedOne"));
        return;
      }
      try {
        await updateTopics.mutateAsync({ enabled_topics: nextEnabled });
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : t("sources.updateFailed"),
        );
      }
    },
    [enabledTopics, t, updateTopics],
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

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const topicOn = isTopicEnabled(enabledTopics, group.topic);
        return (
          <section key={group.topic} className="rounded-lg border">
            <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-sm font-medium">{t(`topic.${group.topic}`)}</h2>
                <p className="text-muted-foreground text-xs">
                  {topicOn
                    ? t("sources.topicGroupCount", { count: group.feeds.length })
                    : t("sources.topicGroupPaused", {
                        count: group.feeds.length,
                      })}
                </p>
              </div>
              {canWrite ? (
                <Switch
                  checked={topicOn}
                  disabled={
                    updateTopics.isPending ||
                    (topicOn && enabledTopics.length === 1)
                  }
                  onCheckedChange={(value) =>
                    void handleToggleTopic(group.topic, value)
                  }
                  aria-label={t("sources.topicEnabledAriaLabel", {
                    topic: t(`topic.${group.topic}`),
                  })}
                />
              ) : (
                <span className="text-muted-foreground text-xs">
                  {topicOn ? t("sources.enabled") : t("sources.disabled")}
                </span>
              )}
            </header>
            {group.feeds.length === 0 ? (
              <p className="text-muted-foreground px-4 py-3 text-xs">
                {t("sources.topicGroupEmpty")}
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {group.feeds.map((feed) => (
                  <EventFeedRow
                    key={feed.id}
                    feed={feed}
                    topicOn={topicOn}
                    collecting={isFeedCollecting(feed, enabledTopics)}
                    busy={pendingId === feed.id}
                    canWrite={canWrite}
                    onToggle={handleToggleFeed}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function EventFeedRow({
  feed,
  topicOn,
  collecting,
  busy,
  canWrite,
  onToggle,
  onDelete,
}: {
  feed: EventFeedItem;
  topicOn: boolean;
  collecting: boolean;
  busy: boolean;
  canWrite: boolean;
  onToggle: (feed: EventFeedItem, enabled: boolean) => void;
  onDelete: (feed: EventFeedItem) => void;
}) {
  const { t } = useTranslation("events");

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <SourceIcon url={feed.icon_url} />
          <p className="font-medium">{feed.name}</p>
          <span className="text-muted-foreground text-xs">
            {t(`sourceKind.${feed.source_kind}`)}
          </span>
        </div>
        <p className="text-muted-foreground truncate text-xs">{feed.url}</p>
        {!topicOn ? (
          <p className="text-muted-foreground text-xs">
            {t("sources.feedPausedByTopic", {
              topic: t(`topic.${feed.topic}`),
            })}
          </p>
        ) : feed.last_error ? (
          <p className="text-destructive text-xs">{feed.last_error}</p>
        ) : feed.last_fetched_at ? (
          <p className="text-muted-foreground text-xs">
            {t("sources.lastFetched")} <RelativeTime iso={feed.last_fetched_at} />
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
            checked={collecting}
            disabled={busy || !topicOn}
            onCheckedChange={(enabled) => onToggle(feed, enabled)}
            aria-label={t("sources.enabledAriaLabel", { name: feed.name })}
          />
          <EventFeedEditSheet feed={feed} />
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onDelete(feed)}
          >
            {t("sources.delete")}
          </Button>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">
          {collecting ? t("sources.enabled") : t("sources.disabled")}
        </span>
      )}
    </li>
  );
}
