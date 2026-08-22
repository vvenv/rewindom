import { describe, expect, it } from "vitest";

import { createBlock, createSection } from "../../section-schema.js";
import { renderBadgesHtml } from "./html.js";

import type { SiteSection } from "../types.js";

function badges(overrides: Partial<SiteSection> = {}): SiteSection {
  const base = createSection("badges");
  return {
    ...base,
    ...overrides,
    settings: { ...base.settings, ...overrides.settings },
  };
}

describe("renderBadgesHtml", () => {
  it("empty section with no image renders nothing", () => {
    expect(renderBadgesHtml(createSection("badges"), {})).toBe("");
  });

  it("renders an external badge with noreferrer and a new tab", () => {
    const section = badges({
      blocks: [
        createBlock("badges", "badge", {
          image: "https://newtool.site/badges/newtool-light.svg",
          href: "https://newtool.site/item/yestino-the-signal",
          alt: "Featured on NewTool.site",
        }),
      ],
    });
    const html = renderBadgesHtml(section, {});
    expect(html).toContain('href="https://newtool.site/item/yestino-the-signal"');
    expect(html).toContain('rel="noreferrer noopener"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('src="https://newtool.site/badges/newtool-light.svg"');
    expect(html).toContain('aria-label="Featured on NewTool.site"');
    expect(html).toContain("--bdg-h:54px");
    expect(html).toContain("bdg center");
  });

  it("swaps light/dark images when a dark variant is set", () => {
    const section = badges({
      blocks: [
        createBlock("badges", "badge", {
          image: "https://example.com/light.svg",
          image_dark: "https://example.com/dark.svg",
          href: "https://example.com/",
          alt: "Listed",
        }),
      ],
    });
    const html = renderBadgesHtml(section, {});
    expect(html).toContain("has-dark");
    expect(html).toContain("bdg-img-light");
    expect(html).toContain("bdg-img-dark");
    expect(html).toContain("https://example.com/dark.svg");
  });

  it("skips javascript: image URLs", () => {
    const section = badges({
      blocks: [
        createBlock("badges", "badge", {
          image: "javascript:alert(1)",
          href: "https://example.com/",
        }),
      ],
    });
    expect(renderBadgesHtml(section, {})).toBe("");
  });
});
