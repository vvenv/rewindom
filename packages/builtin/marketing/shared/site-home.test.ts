import { beforeAll, describe, expect, it } from "vitest";

import { registerHomeLayout } from "./home-layouts.js";
import { HOME_STARTER_PRESET } from "./page-presets.js";
import { registerPageTemplateKind } from "./page-templates.js";
import {
  DEFAULT_HOME_PATH,
  canSetPageAsHome,
  encodeHomeSelectorLayout,
  encodeHomeSelectorPage,
  homeLayoutReplacingPath,
  homeSelectorValue,
  isHomeablePath,
  isHomePathAvailable,
  isSiteHomePage,
  listHomeSelectorOptions,
  listHomeablePageOptions,
  normalizeHomePath,
  pageIdAtHomePath,
  parseHomeSelectorValue,
} from "./site-home.js";

beforeAll(() => {
  registerPageTemplateKind({
    kind: "demo_index",
    slug: "demo",
    path: "/demo",
    group: "x",
    label: "x",
    required_section: null,
    entitlement: "demo",
  });
  registerPageTemplateKind({
    kind: "demo_detail",
    slug: "demo-detail",
    path: "/demo/:slug",
    group: "x",
    label: "x",
    required_section: null,
  });
});

describe("normalizeHomePath", () => {
  it("collapses empty and trailing slashes to /", () => {
    expect(normalizeHomePath("")).toBe("/");
    expect(normalizeHomePath("/")).toBe("/");
    expect(normalizeHomePath("/events/")).toBe("/events");
    expect(normalizeHomePath("events")).toBe("/events");
  });
});

describe("isHomeablePath", () => {
  it("allows the default home and concrete index paths", () => {
    expect(isHomeablePath("/")).toBe(true);
    expect(isHomeablePath("/events")).toBe(true);
    expect(isHomeablePath("/about")).toBe(true);
  });

  it("rejects 404 and parameterized templates", () => {
    expect(isHomeablePath("/404")).toBe(false);
    expect(isHomeablePath("/demo/:slug")).toBe(false);
    expect(isHomeablePath("/events/:slug")).toBe(false);
  });
});

describe("isHomePathAvailable", () => {
  it("keeps / always available", () => {
    expect(isHomePathAvailable("/", new Set())).toBe(true);
  });

  it("hides entitled templates when the switch is off", () => {
    expect(isHomePathAvailable("/demo", new Set())).toBe(false);
    expect(isHomePathAvailable("/demo", new Set(["demo"]))).toBe(true);
  });
});

describe("listHomeablePageOptions", () => {
  it("puts / first and drops parameterized pages", () => {
    const options = listHomeablePageOptions(
      [
        {
          kind: "page",
          slug: "about",
          title: "关于",
          locale: "zh-CN",
        },
        {
          kind: "home",
          slug: "home",
          title: "首页",
          locale: "zh-CN",
        },
        {
          kind: "demo_detail",
          slug: "demo-detail",
          title: "详情",
          locale: "zh-CN",
        },
        {
          kind: "demo_index",
          slug: "demo",
          title: "Demo",
          locale: "zh-CN",
        },
      ],
      "zh-CN",
      new Set(["demo"]),
    );
    expect(options.map((option) => option.path)).toEqual([
      DEFAULT_HOME_PATH,
      "/about",
      "/demo",
    ]);
    expect(options[0]?.title).toBe("首页");
  });
});

describe("pageIdAtHomePath", () => {
  const pages = [
    { id: "home-zh", kind: "home", slug: "home", locale: "zh-CN" },
    { id: "home-en", kind: "home", slug: "home", locale: "en" },
    { id: "about-zh", kind: "page", slug: "about", locale: "zh-CN" },
  ];

  it("prefers the requested locale at the home path", () => {
    expect(pageIdAtHomePath(pages, "/", "en")).toBe("home-en");
    expect(pageIdAtHomePath(pages, "/", "zh-CN")).toBe("home-zh");
  });

  it("falls back to any locale when the requested one is missing", () => {
    expect(pageIdAtHomePath(pages, "/", "ja")).toBe("home-zh");
  });

  it("returns undefined when no page sits at that path", () => {
    expect(pageIdAtHomePath(pages, "/missing", "zh-CN")).toBeUndefined();
  });
});

const RADAR_LAYOUT = {
  key: "test.radar",
  label: "test:radar",
  entitlement: "demo",
  rootPrefix: "/demo",
  preset: {
    ...HOME_STARTER_PRESET,
    key: "test.radar",
    label: "test:radar",
  },
};

describe("首页选择器", () => {
  beforeAll(() => {
    registerHomeLayout(RADAR_LAYOUT);
  });

  it("编解码 layout / page 值", () => {
    expect(parseHomeSelectorValue(encodeHomeSelectorLayout("events.home"))).toEqual({
      type: "layout",
      key: "events.home",
    });
    expect(parseHomeSelectorValue(encodeHomeSelectorPage("/shop"))).toEqual({
      type: "page",
      path: "/shop",
    });
    expect(parseHomeSelectorValue("nope")).toBeNull();
  });

  it("版式在前，默认首页和已接管的枢纽不进页面项", () => {
    const options = listHomeSelectorOptions(
      [
        {
          kind: "home",
          slug: "home",
          title: "首页",
          locale: "zh-CN",
        },
        {
          kind: "page",
          slug: "about",
          title: "关于",
          locale: "zh-CN",
        },
        {
          kind: "demo_index",
          slug: "demo",
          title: "Demo",
          locale: "zh-CN",
        },
      ],
      "zh-CN",
      new Set(["demo"]),
    );
    expect(
      options.filter((option) => option.type === "layout").map((option) => option.key),
    ).toContain("test.radar");
    expect(
      options
        .filter((option) => option.type === "page")
        .map((option) => option.path),
    ).toEqual(["/about"]);
  });

  it("存量 home_path 等于 rootPrefix 时显示为已选该版式", () => {
    expect(homeLayoutReplacingPath("/demo", new Set(["demo"]))?.key).toBe(
      "test.radar",
    );
    expect(
      homeSelectorValue("/demo", "marketing.default", new Set(["demo"])),
    ).toBe(encodeHomeSelectorLayout("test.radar"));
    expect(
      homeSelectorValue("/", "test.radar", new Set(["demo"])),
    ).toBe(encodeHomeSelectorLayout("test.radar"));
    expect(
      homeSelectorValue("/about", "test.radar", new Set(["demo"])),
    ).toBe(encodeHomeSelectorPage("/about"));
  });

  it("版式已接管站点根时枢纽行不再「设为首页」", () => {
    expect(isSiteHomePage("/", "/")).toBe(true);
    expect(isSiteHomePage("/demo", "/")).toBe(false);
    expect(
      canSetPageAsHome({
        pagePath: "/demo",
        homePath: "/",
        homeLayoutKey: "test.radar",
        entitlements: new Set(["demo"]),
      }),
    ).toBe(false);
    expect(
      canSetPageAsHome({
        pagePath: "/about",
        homePath: "/",
        homeLayoutKey: "test.radar",
        entitlements: new Set(["demo"]),
      }),
    ).toBe(true);
  });
});
