import { describe, expect, it } from "vitest";

import {
  addSection,
  moveSection,
  removeSection,
  updateSectionSettings,
} from "./section-schema.js";
import { createSection } from "../../shared/section-schema.js";

describe("section-schema helpers", () => {
  it("moves sections", () => {
    const a = createSection("hero");
    const b = createSection("band");
    expect(moveSection([a, b], 0, 1).map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it("adds removes and updates", () => {
    const a = createSection("hero");
    const withBand = addSection([a], "band");
    expect(withBand).toHaveLength(2);
    const updated = updateSectionSettings(withBand, a.id, {
      headline: "New",
    });
    expect(updated.find((s) => s.id === a.id)?.settings).toEqual({
      headline: "New",
    });
    expect(removeSection(withBand, a.id)).toHaveLength(1);
  });
});
