import { describe, expect, it } from "vitest";

import {
  emptyEventsContext,
  eventsContextEntry,
} from "../events-section-context.js";
import { EVENTS_ENTITY_STRIP_SECTION_TYPE } from "../events-entity-strip-section.js";
import { renderEventsEntityStripHtml } from "./entity-strip-html.js";

import type { PublicEntityStripView } from "../events-section-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function view(
  overrides: Partial<PublicEntityStripView> = {},
): PublicEntityStripView {
  return {
    href: "/entities",
    items: [
      { href: "/entities/openai-abc123", name: "OpenAI", event_count: 8 },
      { href: "/entities/google-def456", name: "Google", event_count: 5 },
      { href: "/entities/chatgpt-ghi789", name: "ChatGPT", event_count: 1 },
    ],
    ...overrides,
  };
}

function section(extra: Record<string, unknown> = {}): SiteSection {
  return {
    id: "s-entity-strip",
    type: EVENTS_ENTITY_STRIP_SECTION_TYPE,
    settings: {
      heading: "实体",
      limit: 24,
      show_counts: true,
      more_label: "查看全部实体",
      ...extra,
    },
  } as SiteSection;
}

function render(
  strip: PublicEntityStripView | null,
  extra: Record<string, unknown> = {},
) {
  const context = emptyEventsContext({ entity_strip: strip });
  return renderEventsEntityStripHtml(section(extra), {
    contributed: eventsContextEntry(context),
  });
}

describe("renderEventsEntityStripHtml", () => {
  it("links every shown entity — this strip exists so the home page stops being a dead end", () => {
    const html = render(view());
    expect(html).toContain('href="/entities/openai-abc123"');
    expect(html).toContain('href="/entities/google-def456"');
    expect(html).toContain('href="/entities/chatgpt-ghi789"');
  });

  it("keeps chip size uniform and marks names as not-to-translate", () => {
    const html = render(view());
    expect(html).toContain('class="events-entity-chip"');
    expect(html).toContain('translate="no"');
    expect(html).not.toContain("font-size:");
  });

  it("caps at the limit setting", () => {
    const html = render(view(), { limit: 2 });
    expect(html).toContain("OpenAI");
    expect(html).toContain("Google");
    expect(html).not.toContain("ChatGPT");
  });

  it("drops counts when the setting is off", () => {
    expect(render(view())).toContain("events-entity-count");
    expect(render(view(), { show_counts: false })).not.toContain(
      "events-entity-count",
    );
  });

  it("points See all at the entity hub", () => {
    const html = render(view());
    expect(html).toContain('href="/entities"');
    expect(html).toContain("查看全部实体");
  });

  it("renders nothing when there are no entities — empty state belongs on the hub", () => {
    expect(render(view({ items: [] }))).toBe("");
    expect(render(null)).toBe("");
  });
});
