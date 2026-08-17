import { PageLayout } from "@rewindom/module-sdk/client";
import { Tabs, TabsList, TabsTrigger } from "@rewindom/ui/tabs";
import { Radar } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EventFeed } from "../components/EventFeed.js";
import { EventFilters } from "../components/EventFilters.js";
import { EventList } from "../components/EventList.js";
import {
  useEventFeed,
  useEvents,
  useEventTopics,
} from "../hooks/useEvents.js";
import { useEventsPage } from "../hooks/useEventsPage.js";

/**
 * 事件浏览页。两个视图：
 * - 「正在发生」= Rising / Now / Today 三区块，回答「现在网上到底在发生什么」；
 * - 「全部事件」= 可筛可排的完整列表，回答「我要找某件事」。
 */
export function Events() {
  const { t } = useTranslation("events");
  const page = useEventsPage();
  const isFeedView = page.view === "feed";

  const feedQuery = useEventFeed(page.topic, isFeedView);
  const listQuery = useEvents(
    {
      page: page.page,
      pageSize: page.pageSize,
      q: page.q,
      topic: page.topic,
      status: page.status,
      followingOnly: page.followingOnly,
      sortBy: page.sortBy,
      sortDir: page.sortDir,
    },
    !isFeedView,
  );
  const topicsQuery = useEventTopics();

  return (
    <PageLayout
      icon={Radar}
      title={t("title")}
      description={t("pageDescription")}
    >
      <div className="flex flex-col gap-5">
        <Tabs value={page.view} onValueChange={page.handleViewChange}>
          <TabsList>
            <TabsTrigger value="feed">{t("tabs.feed")}</TabsTrigger>
            <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <EventFilters
          q={page.q}
          topic={page.topic}
          followingOnly={page.followingOnly}
          sortValue={page.sortValue}
          showSort={!isFeedView}
          hasFilters={page.hasFilters}
          topicCounts={topicsQuery.data?.items ?? []}
          onSearchChange={(value) =>
            page.handleFiltersChange({
              q: value,
              status: page.status,
              following: page.followingOnly,
            })
          }
          onTopicChange={page.handleTopicChange}
          onFollowingChange={(following) =>
            page.handleFiltersChange({
              q: page.q,
              status: page.status,
              following,
            })
          }
          onSortChange={page.handleSortChange}
          onReset={page.handleReset}
        />

        {isFeedView ? (
          <EventFeed
            data={feedQuery.data}
            isLoading={feedQuery.isLoading && !feedQuery.data}
            isError={feedQuery.isError && !feedQuery.data}
            error={feedQuery.error}
            onRetry={() => void feedQuery.refetch()}
          />
        ) : (
          <EventList
            data={listQuery.data}
            isLoading={listQuery.isLoading && !listQuery.data}
            isError={listQuery.isError && !listQuery.data}
            error={listQuery.error}
            page={page.page}
            pageSize={page.pageSize}
            hasFilters={page.hasFilters}
            onRetry={() => void listQuery.refetch()}
          />
        )}
      </div>
    </PageLayout>
  );
}
