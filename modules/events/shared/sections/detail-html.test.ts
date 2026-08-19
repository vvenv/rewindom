import { describe, expect, it } from "vitest";

import {
  emptyEventsContext,
  eventsContextEntry,
} from "../events-section-context.js";
import { EVENTS_DETAIL_SECTION_TYPE } from "../events-detail-section.js";
import { renderEventsDetailHtml } from "./detail-html.js";

import type { PublicEventDetailView } from "../events-section-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function detail(
  overrides: Partial<PublicEventDetailView> = {},
): PublicEventDetailView {
  return {
    slug: "openai-ships-abc123",
    href: "/events/openai-ships-abc123",
    title: "OpenAI ships something",
    headline: "",
    topic: "ai",
    topic_label: "AI",
    status: "developing",
    status_label: "快速发展",
    momentum_label: "",
    momentum_rising: true,
    signal_count: 3,
    source_names: ["OpenAI"],
    last_activity_at: "2026-08-17T12:00:00.000Z",
    fact_labels: [],
    summary: "摘要",
    analyzer: "heuristic",
    provenance_note: "规则整理",
    first_seen_at: "2026-08-17T10:00:00.000Z",
    timeline: [],
    placement: [],
    source_groups: [],
    related: [],
    why_trending: [],
    entities: [
      { href: "/entities/openai-abc123", name: "OpenAI" },
      { href: "/entities/microsoft-def456", name: "Microsoft" },
    ],
    ...overrides,
  } as PublicEventDetailView;
}

function section(): SiteSection {
  return {
    id: "s-detail",
    type: EVENTS_DETAIL_SECTION_TYPE,
    settings: {
      summary_label: "发生了什么",
      show_timeline: true,
      timeline_label: "时间线",
      show_sources: true,
      sources_label: "来源",
      show_related: true,
      related_label: "相关事件",
      show_why: true,
      why_label: "为什么在扩散",
    },
  } as SiteSection;
}

function render(view: PublicEventDetailView | null) {
  const context = emptyEventsContext({ event: view });
  return renderEventsDetailHtml(section(), {
    contributed: eventsContextEntry(context),
  });
}

describe("renderEventsDetailHtml entities", () => {
  it("links the entities it mentions — the only in-site path to entity pages", () => {
    const html = render(detail());
    expect(html).toContain('href="/entities/openai-abc123"');
    expect(html).toContain(">OpenAI</a>");
    expect(html).toContain(">Microsoft</a>");
  });

  it("renders nothing when no entity was extracted", () => {
    const html = render(detail({ entities: [] }));
    expect(html).not.toContain("events-entity-chips");
  });
});
