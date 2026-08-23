import { afterEach, describe, expect, it } from "vitest";

import {
  blockPickerGroup,
  groupByPickerKey,
  sectionPickerGroup,
} from "./section-picker-groups.js";
import {
  registerSectionDefinition,
  resetSectionContributions,
} from "./sections/index.js";
import { MARKETING_CHROME_GROUP, MARKETING_SECTION_GROUP } from "./sections/types.js";

afterEach(() => {
  resetSectionContributions();
});

describe("groupByPickerKey", () => {
  it("keeps first-seen group order and does not flatten a single group", () => {
    const grouped = groupByPickerKey(
      [
        { id: "hero", group: "a" },
        { id: "band", group: "a" },
        { id: "shop", group: "b" },
      ],
      (item) => item.group,
    );
    expect(grouped.map((entry) => entry.group)).toEqual(["a", "b"]);
    expect(grouped[0]?.items.map((item) => item.id)).toEqual(["hero", "band"]);
  });
});

describe("sectionPickerGroup", () => {
  it("uses the declared group, not the type prefix", () => {
    registerSectionDefinition({
      type: "demo.calendar",
      label: "demo:calendar",
      group: "demo:section.group",
      placements: ["page"],
      settings: [],
    });
    expect(sectionPickerGroup("demo.calendar")).toBe("demo:section.group");
  });

  it("falls back to the module prefix when the type is unknown", () => {
    expect(sectionPickerGroup("shop.retired")).toBe("shop:section.group");
    expect(sectionPickerGroup("hero")).toBe(MARKETING_SECTION_GROUP);
  });
});

describe("blockPickerGroup", () => {
  it("puts builtin chrome blocks in the chrome group", () => {
    expect(
      blockPickerGroup({
        type: "chrome_locale",
        label: "x",
        settings: [],
      }),
    ).toBe(MARKETING_CHROME_GROUP);
  });

  it("puts contributed chrome blocks with their module sections", () => {
    expect(
      blockPickerGroup({
        type: "shop.cart-link",
        label: "x",
        settings: [],
      }),
    ).toBe("shop:section.group");
  });

  it("honours an explicit group (member-family blocks)", () => {
    expect(
      blockPickerGroup({
        type: "site-billing.something",
        label: "x",
        group: "site-member:section.group",
        settings: [],
      }),
    ).toBe("site-member:section.group");
  });
});
