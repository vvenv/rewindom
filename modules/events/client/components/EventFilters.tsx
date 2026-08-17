import {
  DebouncedSearchInput,
  FilterResetButton,
} from "@rewindom/module-sdk/client";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { cn } from "@rewindom/ui/utils";
import { useTranslation } from "react-i18next";

import { EVENT_SORT_VALUES, EVENT_TOPIC_ORDER } from "../lib/events.js";

import type { EventSortValue } from "../lib/events.js";
import type { EventTopic, EventTopicCount } from "../../shared/index.js";

interface EventFiltersProps {
  q?: string;
  topic?: EventTopic;
  followingOnly: boolean;
  sortValue: EventSortValue;
  /** 全量列表视图才需要排序；探索视图的顺序由区块语义决定 */
  showSort: boolean;
  hasFilters: boolean;
  topicCounts: EventTopicCount[];
  onSearchChange: (value: string) => void;
  onTopicChange: (topic: EventTopic | undefined) => void;
  onFollowingChange: (following: boolean) => void;
  onSortChange: (value: EventSortValue) => void;
  onReset: () => void;
}

export function EventFilters({
  q,
  topic,
  followingOnly,
  sortValue,
  showSort,
  hasFilters,
  topicCounts,
  onSearchChange,
  onTopicChange,
  onFollowingChange,
  onSortChange,
  onReset,
}: EventFiltersProps) {
  const { t } = useTranslation("events");
  const counts = new Map(topicCounts.map((row) => [row.topic, row.count]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <DebouncedSearchInput
          value={q ?? ""}
          onCommit={onSearchChange}
          placeholder={t("search.placeholder")}
          className="w-full sm:w-64"
        />
        <Button
          variant={followingOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onFollowingChange(!followingOnly)}
        >
          {t("filters.following")}
        </Button>
        {showSort ? (
          <Select
            value={sortValue}
            onValueChange={(value) => onSortChange(value as EventSortValue)}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder={t("sort.label")} />
            </SelectTrigger>
            <SelectContent>
              {EVENT_SORT_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`sort.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <FilterResetButton
          hasActiveFilters={hasFilters}
          onReset={onReset}
          title={t("filters.reset")}
        />
      </div>

      {/* 主题不是下拉而是一排芯片：MVP §10 只有 7 个主题，摊开比藏进菜单快一步 */}
      <div className="flex flex-wrap gap-2">
        <TopicChip
          label={t("filters.allTopics")}
          active={topic === undefined}
          onClick={() => onTopicChange(undefined)}
        />
        {EVENT_TOPIC_ORDER.map((value) => (
          <TopicChip
            key={value}
            label={t(`topic.${value}`)}
            count={counts.get(value)}
            active={topic === value}
            onClick={() => onTopicChange(topic === value ? undefined : value)}
          />
        ))}
      </div>
    </div>
  );
}

function TopicChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none",
        active
          ? "bg-primary text-primary-foreground border-transparent"
          : "hover:bg-muted",
      )}
      aria-pressed={active}
    >
      {label}
      {count !== undefined && count > 0 ? (
        <Badge variant="secondary" className="px-1 py-0 text-[10px]">
          {count}
        </Badge>
      ) : null}
    </button>
  );
}
