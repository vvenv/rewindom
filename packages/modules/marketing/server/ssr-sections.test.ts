import { describe, expect, it } from "vitest";

import { createSection, type SiteSection } from "../shared/section-schema.js";

import { renderSectionHtml } from "./ssr-sections.js";

function hero(settings: Record<string, unknown>): SiteSection {
  const section = createSection("hero");
  section.settings = {
    ...section.settings,
    headline: "Hi",
    ...settings,
  } as never;
  return section;
}

describe("renderSectionHtml", () => {
  // SSR 一度完全没渲染光晕：SEO 首屏没有、水合后突然冒出来
  it("renders the glow only when the setting is on", () => {
    expect(renderSectionHtml(hero({ show_glow: true }))).toContain("sec-glow");
    expect(renderSectionHtml(hero({ show_glow: false }))).not.toContain(
      "sec-glow",
    );
  });

  // 光晕要顶到 section 容器上沿（含上留白），所以画在色块层、不在正文里
  it("puts the glow on the band so it covers the section padding", () => {
    const html = renderSectionHtml(hero({ show_glow: true }));
    expect(html).toMatch(
      /class="sec-band[^"]*has-glow[^"]*"[^>]*>\s*<div class="sec-glow"/u,
    );
    // 正文盒子仍在光晕之后，不被它盖住
    expect(html.indexOf("sec-glow")).toBeLessThan(html.indexOf("sec-content"));
  });

  it("puts the two width axes on the band and the content", () => {
    const html = renderSectionHtml(
      hero({ width: "full", content_width: "narrow" }),
    );
    expect(html).toContain("sec-w-full");
    expect(html).toContain("sec-c-narrow");
  });

  it("carries the gap for the section above it", () => {
    expect(renderSectionHtml(hero({}), 48)).toContain("--sec-gap:48px");
    expect(renderSectionHtml(hero({}))).toContain("--sec-gap:0px");
  });
});
