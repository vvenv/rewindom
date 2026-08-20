import { beforeAll, describe, expect, it } from "vitest";

import {
  DEFAULT_HOME_LAYOUT_KEY,
  registerHomeLayout,
  type HomeLayoutDefinition,
} from "./home-layouts.js";
import "./page-presets.js";
import { HOME_PAGE_KIND } from "./page-templates.js";
import { listSiteTemplateAreaGroups } from "./site-template-area.js";

const AREA_LAYOUT: HomeLayoutDefinition = {
  key: "area_test.home",
  label: "area_test:home.label",
  group: "area_test:template.group",
  entitlement: "area_test",
  preset: {
    key: "area_test.home",
    label: "area_test:home.label",
    kind: "home",
    slug: "home",
    titleKey: "area_test:home.title",
    descriptionKey: "area_test:home.description",
    sections: [{ type: "hero" }],
  },
};

describe("listSiteTemplateAreaGroups", () => {
  beforeAll(() => {
    registerHomeLayout(AREA_LAYOUT);
  });

  it("未开通的贡献版式不进常驻区，首页行留在首页组", () => {
    const groups = listSiteTemplateAreaGroups(
      new Set(),
      DEFAULT_HOME_LAYOUT_KEY,
    );
    expect(
      groups.some((group) => group.group === "area_test:template.group"),
    ).toBe(false);
    const homeGroup = groups.find(
      (group) => group.group === "cms.homeTemplate",
    );
    expect(
      homeGroup?.items.some(
        (item) =>
          item.type === "template" && item.template.kind === HOME_PAGE_KIND,
      ),
    ).toBe(true);
    expect(homeGroup?.items.some((item) => item.type === "home_layout")).toBe(
      false,
    );
  });

  it("开通后未套用的贡献版式出现在自己的分组，排在模板页前面", () => {
    const groups = listSiteTemplateAreaGroups(
      new Set(["area_test"]),
      DEFAULT_HOME_LAYOUT_KEY,
    );
    const product = groups.find(
      (group) => group.group === "area_test:template.group",
    );
    expect(product?.items[0]).toEqual({
      type: "home_layout",
      layout: AREA_LAYOUT,
    });
    const homeGroup = groups.find(
      (group) => group.group === "cms.homeTemplate",
    );
    expect(
      homeGroup?.items.some(
        (item) =>
          item.type === "template" && item.template.kind === HOME_PAGE_KIND,
      ),
    ).toBe(true);
  });

  it("套用贡献版式后首页行落到该组，空白首页不进常驻区", () => {
    const groups = listSiteTemplateAreaGroups(
      new Set(["area_test"]),
      AREA_LAYOUT.key,
    );
    const product = groups.find(
      (group) => group.group === "area_test:template.group",
    );
    expect(
      product?.items.some(
        (item) =>
          item.type === "template" && item.template.kind === HOME_PAGE_KIND,
      ),
    ).toBe(true);
    expect(
      product?.items.some(
        (item) =>
          item.type === "home_layout" && item.layout.key === AREA_LAYOUT.key,
      ),
    ).toBe(false);

    expect(groups.find((group) => group.group === "cms.homeTemplate")).toBe(
      undefined,
    );
  });
});
