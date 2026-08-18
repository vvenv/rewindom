import { beforeAll, describe, expect, it } from "vitest";

import { registerPageTemplateKind } from "./page-templates.js";
import {
  DEFAULT_HOME_PATH,
  isHomeablePath,
  isHomePathAvailable,
  listHomeablePageOptions,
  normalizeHomePath,
  pageIdAtHomePath,
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
