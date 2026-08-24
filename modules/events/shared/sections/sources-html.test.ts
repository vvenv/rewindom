import { describe, expect, it } from "vitest";

import {
  emptyEventsContext,
  eventsContextEntry,
} from "../events-section-context.js";
import { EVENTS_SOURCES_SECTION_TYPE } from "../events-sources-section.js";
import { renderEventsSourcesHtml } from "./sources-html.js";

import type { PublicSourceCatalogView } from "../events-section-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function catalog(
  overrides: Partial<PublicSourceCatalogView> = {},
): PublicSourceCatalogView {
  const openai = {
    name: "OpenAI",
    href: "https://openai.com/",
    icon_url: "/events/icons/openai.com",
    topic: "ai" as const,
    topic_label: "AI",
    kind: "official" as const,
    kind_label: "Official",
  };
  const hn = {
    name: "Hacker News",
    href: "https://news.ycombinator.com/",
    icon_url: "/events/icons/news.ycombinator.com",
    topic: "tech" as const,
    topic_label: "Tech",
    kind: "community" as const,
    kind_label: "Community",
  };
  return {
    items: [hn, openai],
    groups: [
      { topic: "ai", label: "AI", items: [openai] },
      { topic: "tech", label: "Tech", items: [hn] },
    ],
    ...overrides,
  };
}

function section(extra: Record<string, unknown> = {}): SiteSection {
  return {
    id: "s-sources",
    type: EVENTS_SOURCES_SECTION_TYPE,
    settings: {
      heading: "Sources we collect",
      subheading: "Publisher homepages, not RSS feeds",
      group_by_topic: true,
      empty_text: "No feeds are collecting right now.",
      ...extra,
    },
  } as SiteSection;
}

function render(
  view: PublicSourceCatalogView | undefined,
  extra: Record<string, unknown> = {},
) {
  return renderEventsSourcesHtml(section(extra), {
    contributed: eventsContextEntry(
      emptyEventsContext(view ? { source_catalog: view } : {}),
    ),
  });
}

describe("renderEventsSourcesHtml", () => {
  it("links publisher homepages, never RSS or API URLs", () => {
    const html = render(catalog());
    expect(html).toContain('href="https://openai.com/"');
    expect(html).toContain('href="https://news.ycombinator.com/"');
    expect(html).not.toContain("rss.xml");
    expect(html).not.toContain("firebaseio.com");
  });

  it("groups by topic when the setting is on", () => {
    const html = render(catalog());
    expect(html).toContain("events-source-catalog-topic");
    expect(html.indexOf(">AI<")).toBeLessThan(html.indexOf(">Tech<"));
    expect(html.indexOf("OpenAI")).toBeLessThan(html.indexOf("Hacker News"));
  });

  it("flattens into one list when grouping is off", () => {
    const html = render(catalog(), { group_by_topic: false });
    expect(html).not.toContain("events-source-catalog-topic");
    expect(html).toContain("OpenAI");
    expect(html).toContain("Hacker News");
  });

  it("still paints heading + empty copy when the catalog is empty", () => {
    const html = render({ items: [], groups: [] });
    expect(html).toContain("Sources we collect");
    expect(html).toContain("No feeds are collecting right now.");
    expect(html).toContain("events-source-catalog-empty");
  });

  it("still paints heading + empty copy when the catalog was never loaded", () => {
    const html = render(undefined);
    expect(html).toContain("Sources we collect");
    expect(html).toContain("No feeds are collecting right now.");
  });
});
