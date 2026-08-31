import { describe, expect, it } from "vitest";

import {
  THUMBNAIL_PUMP_FRAMES,
  buildUselessThumbnailDocument,
} from "./thumbnail-page.js";

describe("buildUselessThumbnailDocument", () => {
  it("把可交互物放进舞台，并带上泵帧", () => {
    const html = buildUselessThumbnailDocument("<canvas></canvas>");
    expect(html).toContain('<div class="useless-thing"><canvas></canvas></div>');
    expect(html).toContain("window.__pump");
    expect(html).toContain("background:transparent");
    expect(html).not.toContain("--bg:#fbfbf9");
    expect(html).toContain("location.search.indexOf('pump')");
    const capture = buildUselessThumbnailDocument("<canvas></canvas>", {
      pump: "always",
    });
    expect(capture).not.toContain("location.search.indexOf('pump')");
    expect(capture).toContain("ResizeObserver=undefined");
    expect(THUMBNAIL_PUMP_FRAMES).toBeGreaterThan(0);
  });
});
