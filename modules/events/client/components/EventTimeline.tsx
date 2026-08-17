import { EmptyState } from "@rewindom/module-sdk/client";
import { ExternalLink, History } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatClockTime, formatDayLabel, groupByDay } from "../lib/events.js";

import type { EventTimelineItem } from "../../shared/index.js";

/**
 * 时间线（MVP §3）——整个产品最核心的一块：让用户一眼理解事情是怎么发展到现在的。
 *
 * 每一格都挂着来源链接，因为时间线本身也是证据链，不是叙事。
 */
export function EventTimeline({ entries }: { entries: EventTimelineItem[] }) {
  const { t, i18n } = useTranslation("events");

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
            {group.entries.map((entry) => (
              <li key={entry.id} className="relative flex flex-col gap-0.5">
                <span className="bg-border absolute top-1.5 -left-[21px] size-2 rounded-full" />
                <div className="flex items-baseline gap-3">
                  <span className="text-muted-foreground w-12 shrink-0 text-xs tabular-nums">
                    {formatClockTime(entry.occurred_at, i18n.language)}
                  </span>
                  <span className="text-sm">
                    {/* label_code 走本地文案，label_text 是 AI 写的自由文案；二选一 */}
                    {entry.label_code
                      ? t(entry.label_code, { source: entry.source_name })
                      : entry.label_text}
                  </span>
                </div>
                {entry.url ? (
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground hover:text-foreground ml-15 inline-flex w-fit items-center gap-1 text-xs hover:underline"
                  >
                    {entry.source_name}
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
