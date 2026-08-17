import { EmptyState } from "@rewindom/module-sdk/client";
import { Radar } from "lucide-react";

import { EventCard } from "./EventCard.js";

import type { EventListItem } from "../../shared/index.js";

/** 首页的一个区块（Rising / Now）。标题与说明由调用方给，组件只管排版。 */
export function EventFeedSection({
  title,
  hint,
  events,
  emptyLabel,
}: {
  title: string;
  hint: string;
  events: EventListItem[];
  emptyLabel: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold tracking-wide uppercase">{title}</h2>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </header>
      {events.length === 0 ? (
        <EmptyState icon={Radar} size="panel" title={emptyLabel} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
