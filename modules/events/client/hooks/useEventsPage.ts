import { useCallback } from "react";

import {
  applyFiltersToSearchParams,
  parseListPage,
  parseListPageSize,
  parseListSort,
  setOrDeleteParam,
} from "@rewindom/module-sdk/client";
import { useSearchParams } from "react-router";

import {
  fromEventSortValue,
  toEventSortValue,
  type EventSortValue,
} from "../lib/events.js";

import { isEventStatus, isEventTopic } from "../../shared/index.js";

import type { EventStatus, EventTopic } from "../../shared/index.js";

/** 探索视图（三个区块）与全量列表视图。URL 上留痕，刷新不丢。 */
export type EventsView = "feed" | "all";

export function useEventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const view: EventsView = searchParams.get("view") === "all" ? "all" : "feed";
  const q = searchParams.get("q") || undefined;
  const topicParam = searchParams.get("topic");
  const topic: EventTopic | undefined = isEventTopic(topicParam)
    ? topicParam
    : undefined;
  const statusParam = searchParams.get("status");
  const status: EventStatus | undefined = isEventStatus(statusParam)
    ? statusParam
    : undefined;
  const followingOnly = searchParams.get("following") === "true";
  const page = parseListPage(searchParams.get("page"));
  const pageSize = parseListPageSize(searchParams.get("page_size"));
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sortValue = toEventSortValue(sortBy, sortDir);

  const handleViewChange = useCallback(
    (next: string) => {
      setSearchParams((params) => {
        const updated = new URLSearchParams(params);
        setOrDeleteParam(updated, "view", next === "all" ? "all" : undefined);
        // 换视图等于换了一份结果集，页码留着只会落到空页
        updated.delete("page");
        return updated;
      });
    },
    [setSearchParams],
  );

  const handleTopicChange = useCallback(
    (next: EventTopic | undefined) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, { topic: next }),
      );
    },
    [searchParams, setSearchParams],
  );

  const handleFiltersChange = useCallback(
    (filters: {
      q?: string;
      status?: EventStatus;
      following?: boolean;
    }) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, {
          q: filters.q,
          status: filters.status,
          following: filters.following ? "true" : undefined,
        }),
      );
    },
    [searchParams, setSearchParams],
  );

  const handleSortChange = useCallback(
    (next: EventSortValue) => {
      const { sortBy: nextBy, sortDir: nextDir } = fromEventSortValue(next);
      setSearchParams((params) => {
        const updated = new URLSearchParams(params);
        setOrDeleteParam(updated, "sort_by", nextBy);
        setOrDeleteParam(updated, "sort_dir", nextDir);
        updated.delete("page");
        return updated;
      });
    },
    [setSearchParams],
  );

  const handleReset = useCallback(() => {
    setSearchParams((params) => {
      const updated = new URLSearchParams(params);
      for (const key of ["q", "topic", "status", "following", "page"]) {
        updated.delete(key);
      }
      return updated;
    });
  }, [setSearchParams]);

  return {
    view,
    q,
    topic,
    status,
    followingOnly,
    page,
    pageSize,
    sortBy,
    sortDir,
    sortValue,
    hasFilters: Boolean(q || topic || status || followingOnly),
    handleViewChange,
    handleTopicChange,
    handleFiltersChange,
    handleSortChange,
    handleReset,
  };
}
