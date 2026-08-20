import { EmptyState } from "@rewindom/module-sdk/client";
import { Badge } from "@rewindom/ui/badge";
import { ExternalLink, History } from "lucide-react";
import { useTranslation } from "react-i18next";

import { describeTimelineEntry } from "../../shared/index.js";
import { formatClockTime, formatDayLabel, groupByDay } from "../lib/events.js";

import type { EventTimelineItem } from "../../shared/index.js";

/**
 * 时间线——整个产品最核心的一块：让用户一眼看出事情是怎么推进到现在的。
 *
 * 每一格都挂着来源链接，因为时间线本身也是证据链，不是叙事。
 * 正文是「这条比前面多了什么」，不是「这家媒体开始报道」。
 */
export function EventTimeline({ entries }: { entries: EventTimelineItem[] }) {
  const { t, i18n } = useTranslation("events");
  const translate = (
    key: string,
    params?: Record<string, string | number>,
  ): string => t(key, params);

  if (entries.length === 0) {
    return (
      <EmptyState icon={History} size="panel" title={t("detail.timelineEmpty")} />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groupByDay(entries).map((group) => (
        <div key={group.day} className="flex flex-col gap-3">
          <div className="text-muted-foreground text-xs font-medium">
            {formatDayLabel(group.entries[0].occurred_at, i18n.language)}
          </div>
          <ol className="border-border flex flex-col gap-3 border-l pl-4">
            {group.entries.map((entry) => {
              const view = describeTimelineEntry(entry, translate);
              const conflict = entry.label_code === "timeline.role.conflict";
              return (
                <li key={entry.id} className="relative flex flex-col gap-0.5">
                  <span className="bg-border absolute top-1.5 -left-[21px] size-2 rounded-full" />
                  <div className="flex items-baseline gap-3">
                    <span className="text-muted-foreground w-12 shrink-0 text-xs tabular-nums">
                      {formatClockTime(entry.occurred_at, i18n.language)}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      {view.role_label ? (
                        <Badge
                          variant={conflict ? "default" : "outline"}
                          className="w-fit font-normal"
                        >
                          {view.role_label}
                        </Badge>
                      ) : null}
                      <span className="text-sm">{view.text}</span>
                    </div>
                  </div>
                  {entry.incident_updates.length > 0 ? (
                    /*
                     * 状态页那条 incident 的一手更新序列，嵌在它自己那一格里。
                     * **不拆成兄弟格**：格子的身份是信号，一次故障是一条信号，
                     * 它的多次更新是这条信号的内部结构，不是多个来源。
                     * 阶段词与正文逐字取自来源，不翻译——与「只显示来源原文」同口径。
                     */
                    <ol className="border-border ml-15 flex flex-col gap-1.5 border-l pl-3">
                      {entry.incident_updates.map((update) => (
                        <li
                          key={`${update.occurred_at}-${update.phase}`}
                          className="flex items-baseline gap-2 text-xs"
                        >
                          <span className="text-muted-foreground w-11 shrink-0 tabular-nums">
                            {formatClockTime(update.occurred_at, i18n.language)}
                          </span>
                          <span className="shrink-0 font-medium">{update.phase}</span>
                          <span className="text-muted-foreground">{update.text}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-muted-foreground hover:text-foreground ml-15 inline-flex w-fit items-center gap-1 text-xs hover:underline"
                    >
                      <span translate="no">{entry.source_name}</span>
                      <ExternalLink className="size-3" />
                    </a>
                  ) : entry.source_name ? (
                    <span
                      translate="no"
                      className="text-muted-foreground ml-15 text-xs"
                    >
                      {entry.source_name}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
