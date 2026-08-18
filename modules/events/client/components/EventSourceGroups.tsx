import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RelativeTime } from "./RelativeTime.js";

import { EVENT_SOURCE_KINDS } from "../../shared/index.js";

import type { EventSourceItem, EventSourceKind } from "../../shared/index.js";

interface EventSourceGroupsProps {
  sources: Record<EventSourceKind, EventSourceItem[]>;
  /** 传了才出现「移除」——只读视角（无 events.write、公开面）不该看到这个按钮 */
  onRemove?: (source: EventSourceItem) => void;
  removingId?: string | null;
}

/**
 * 来源分组（MVP §4、§13）。
 *
 * 刻意**不**做成「各平台热榜并排」——那会把产品退回聚合器。这里的顺序是
 * 一手 → 报道 → 讨论，读下来就是一条可核对的证据链，而不是几个榜单。
 *
 * 移除按钮**不能包在链接里**（`<button>` 嵌 `<a>` 既不合法也点不准），
 * 所以整条是 flex 行：左边链接占满，右边留给动作。
 */
export function EventSourceGroups({
  sources,
  onRemove,
  removingId,
}: EventSourceGroupsProps) {
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
                <li
                  key={source.id}
                  className="hover:bg-muted/60 flex items-stretch gap-1 rounded-lg border transition-colors"
                >
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex min-w-0 flex-1 flex-col gap-1 p-3"
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
                  {onRemove ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive m-2 shrink-0 self-center"
                      disabled={removingId === source.id}
                      aria-label={t("detail.removeSignal")}
                      title={t("detail.removeSignal")}
                      onClick={() => onRemove(source)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </div>
  );
}
