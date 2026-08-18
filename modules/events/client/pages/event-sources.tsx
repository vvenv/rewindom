import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Plus, Rss } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EventFeedCreateSheet } from "../components/EventFeedCreateSheet.js";
import { EventFeedList } from "../components/EventFeedList.js";
import { EventTopicSettings } from "../components/EventTopicSettings.js";
import { useEventFeeds } from "../hooks/useEventFeeds.js";

export function EventSources() {
  const { t } = useTranslation("events");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("events.write");
  const { data, isLoading, isError, error, refetch } = useEventFeeds();

  return (
    <PageLayout
      icon={Rss}
      title={t("sources.title")}
      description={t("sources.pageDescription")}
      action={
        canWrite ? (
          <EventFeedCreateSheet>
            <DraggableFabTrigger storageKey="events_feed_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("sources.create")}</span>
            </DraggableFabTrigger>
          </EventFeedCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-6">
        <div className="max-w-2xl">
          <EventTopicSettings />
        </div>
        <EventFeedList
          feeds={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          error={error instanceof Error ? error : null}
          onRetry={() => void refetch()}
        />
      </div>
    </PageLayout>
  );
}
