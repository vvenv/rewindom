import { Badge } from "@rewindom/ui/badge";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RelativeTime } from "./RelativeTime.js";

import { EVENT_SOURCE_KINDS } from "../../shared/index.js";

import type { EventSourceItem, EventSourceKind } from "../../shared/index.js";

/**
 * 来源分组（MVP §4、§13）。
 *
 * 刻意**不**做成「各平台热榜并排」——那会把产品退回聚合器。这里的顺序是
 * 一手 → 报道 → 讨论，读下来就是一条可核对的证据链，而不是几个榜单。
 */
export function EventSourceGroups({
  sources,
}: {
  sources: Record<EventSourceKind, EventSourceItem[]>;
}) {
  const { t } = useTranslation("events");

  return (
    <div className="flex flex-col gap-5">
      {EVENT_SOURCE_KINDS.filter((kind) => sources[kind].length > 0).map(
        (kind) => (
          <div key={kind} className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t(`sourceKind.${kind}`)}
            </h3>
            <ul className="flex flex-col gap-2">
              {sources[kind].map((source) => (
                <li key={source.id}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:bg-muted/60 group flex flex-col gap-1 rounded-lg border p-3 transition-colors"
                  >
                    <span className="flex items-start gap-2 text-sm font-medium">
                      <span className="flex-1">{source.title}</span>
                      <ExternalLink className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                    </span>
                    <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <Badge variant="outline">{source.source_name}</Badge>
                      <RelativeTime iso={source.published_at} />
                      {source.score > 0 ? (
                        <span>{t("detail.score", { count: source.score })}</span>
                      ) : null}
                      {source.comment_count > 0 ? (
                        <span>
                          {t("detail.comments", { count: source.comment_count })}
                        </span>
                      ) : null}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </div>
  );
}
