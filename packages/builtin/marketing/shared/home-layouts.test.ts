import { beforeAll, describe, expect, it } from "vitest";

import {
  DEFAULT_HOME_LAYOUT_KEY,
  getHomeLayout,
  listHomeLayouts,
  registerHomeLayout,
  resolveHomeLayout,
  type HomeLayoutDefinition,
} from "./home-layouts.js";
import { HOME_STARTER_PRESET } from "./page-presets.js";

const DEMO_LAYOUT: HomeLayoutDefinition = {
  key: "demo.home",
  label: "demo:home.label",
  entitlement: "demo",
  rootPrefix: "/demo",
  preset: {
    key: "demo.home",
    label: "demo:home.label",
    kind: "home",
    slug: "home",
    titleKey: "demo:home.title",
    descriptionKey: "demo:home.description",
    sections: [{ type: "hero" }],
  },
};

describe("首页版式注册表", () => {
  beforeAll(() => {
    registerHomeLayout(DEMO_LAYOUT);
  });

  it("marketing 自带空白首页", () => {
    expect(getHomeLayout(DEFAULT_HOME_LAYOUT_KEY)?.preset).toBe(
      HOME_STARTER_PRESET,
    );
    expect(getHomeLayout(DEFAULT_HOME_LAYOUT_KEY)?.group).toBeUndefined();
    expect(HOME_STARTER_PRESET.sections).toEqual([]);
    expect(listHomeLayouts(new Set()).map((layout) => layout.key)).toContain(
      DEFAULT_HOME_LAYOUT_KEY,
    );
    expect(listHomeLayouts(new Set()).map((layout) => layout.key)).toContain(
      "marketing.landing",
    );
  });

  it("贡献一套后选择器里能看到，未开通则隐藏", () => {
    expect(getHomeLayout("demo.home")).toBe(DEMO_LAYOUT);
    expect(getHomeLayout("demo.home")?.rootPrefix).toBe("/demo");
    expect(
      listHomeLayouts(new Set()).map((layout) => layout.key),
    ).not.toContain("demo.home");
    expect(
      listHomeLayouts(new Set(["demo"])).map((layout) => layout.key),
    ).toContain("demo.home");
    expect(() => registerHomeLayout(DEMO_LAYOUT)).not.toThrow();
  });

  it("同一 key 再登记则换成新定义", () => {
    const next: HomeLayoutDefinition = {
      ...DEMO_LAYOUT,
      label: "demo:home.updated",
    };
    registerHomeLayout(next);
    expect(getHomeLayout("demo.home")).toBe(next);
    registerHomeLayout(DEMO_LAYOUT);
  });

  it("preset.kind 不是 home 直接抛", () => {
    expect(() =>
      registerHomeLayout({
        key: "demo.not-home",
        label: "x",
        preset: {
          ...DEMO_LAYOUT.preset,
          key: "demo.not-home",
          kind: "page",
        },
      }),
    ).toThrow("site.home_layout_kind:demo.not-home");
  });

  it("开关关掉或 key 不认识时回落到空白首页", () => {
    expect(resolveHomeLayout("demo.home", new Set()).key).toBe(
      DEFAULT_HOME_LAYOUT_KEY,
    );
    expect(resolveHomeLayout("no-such", new Set(["demo"])).key).toBe(
      DEFAULT_HOME_LAYOUT_KEY,
    );
    expect(resolveHomeLayout("demo.home", new Set(["demo"]))).toBe(DEMO_LAYOUT);
  });
});
