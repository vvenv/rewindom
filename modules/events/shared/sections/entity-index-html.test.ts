import { describe, expect, it } from "vitest";

import {
  emptyEventsContext,
  eventsContextEntry,
} from "../events-section-context.js";
import { EVENTS_ENTITY_INDEX_SECTION_TYPE } from "../events-entity-index-section.js";
import { renderEventsEntityIndexHtml } from "./entity-index-html.js";

import type { PublicEntityIndexView } from "../events-section-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function view(
  overrides: Partial<PublicEntityIndexView> = {},
): PublicEntityIndexView {
  return {
    href: "/events/entities",
    groups: [
      {
        kind: "company",
        label: "公司",
        items: [
          { href: "/events/entities/openai-abc123", name: "OpenAI", event_count: 4 },
          { href: "/events/entities/google-def456", name: "Google", event_count: 2 },
        ],
      },
      {
        kind: "product",
        label: "产品",
        items: [
          { href: "/events/entities/chatgpt-ghi789", name: "ChatGPT", event_count: 1 },
        ],
      },
    ],
    ...overrides,
  };
}

function section(extra: Record<string, unknown> = {}): SiteSection {
  return {
    id: "s-entity-index",
    type: EVENTS_ENTITY_INDEX_SECTION_TYPE,
    settings: {
      show_counts: true,
      empty_text: "还没有实体",
      ...extra,
    },
  } as SiteSection;
}

function render(
  index: PublicEntityIndexView | null,
  extra: Record<string, unknown> = {},
) {
  const context = emptyEventsContext({ entity_index: index });
  return renderEventsEntityIndexHtml(section(extra), {
    contributed: eventsContextEntry(context),
  });
}

describe("renderEventsEntityIndexHtml", () => {
  it("links every entity — this hub exists so they stop being orphan pages", () => {
    const html = render(view());
    expect(html).toContain('href="/events/entities/openai-abc123"');
    expect(html).toContain('href="/events/entities/google-def456"');
    expect(html).toContain('href="/events/entities/chatgpt-ghi789"');
  });

  it("groups by kind and keeps the kind label", () => {
    const html = render(view());
    expect(html).toContain(">公司</h2>");
    expect(html).toContain(">产品</h2>");
  });

  it("drops counts when the setting is off", () => {
    expect(render(view())).toContain("events-entity-count");
    expect(render(view(), { show_counts: false })).not.toContain(
      "events-entity-count",
    );
  });

  it("shows the empty state instead of an empty list", () => {
    const html = render(view({ groups: [] }));
    expect(html).toContain("还没有实体");
    expect(html).not.toContain("events-entity-chips");
  });

  it("renders nothing when the page has no entity list at all", () => {
    expect(render(null)).toBe("");
  });
});
