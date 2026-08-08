/**
 * 跨模块 section 贡献契约。
 *
 * 守两件事：贡献段能像内置段一样被解析 / 渲染 / 摆进编辑器菜单；以及**停用之后**
 * 不会把租户已经摆上去的那一段烧掉——后者才是这个契约敢用的前提。
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  getSectionDefinition,
  parseSections,
  registerSectionDefinition,
  resetSectionContributions,
  safeSections,
  sectionTypesFor,
  settingText,
  type SectionDefinition,
} from "./section-schema.js";
import {
  registerSiteSectionHtml,
  renderSectionHtml,
  SECTION_HTML,
} from "./sections/html.js";
import {
  loadMarketingSiteCss,
  loadMarketingSiteCssFor,
  resetSectionCss,
} from "./load-marketing-site-css.js";

const TYPE = "demo.calendar";

const demoSection: SectionDefinition = {
  type: TYPE,
  label: "demo:section.calendar",
  placements: ["page"],
  entitlement: "tenant-demo",
  settings: [{ type: "text", id: "heading", label: "demo:heading" }],
};

const renderDemo = (section: { settings: Record<string, unknown> }) =>
  `<div class="demo">${settingText(section.settings as never, "heading")}</div>`;

function contribute(): void {
  registerSiteSectionHtml(demoSection, renderDemo as never, {
    css: ".demo{color:red}",
  });
}

afterEach(() => {
  resetSectionContributions();
  resetSectionCss();
  delete SECTION_HTML[TYPE];
});

describe("注册", () => {
  it("贡献段和内置段一样查得到、能进菜单", () => {
    contribute();
    expect(getSectionDefinition(TYPE)).toBe(demoSection);
    expect(sectionTypesFor("page")).toContain(TYPE);
  });

  it("type 撞了内置段直接抛——撞名的后果是页面被别人的 schema 解析", () => {
    expect(() =>
      registerSectionDefinition({ ...demoSection, type: "hero" }),
    ).toThrow(/section_type_conflict/u);
  });

  it("两个模块用同一个 type 也直接抛", () => {
    contribute();
    expect(() =>
      registerSectionDefinition({ ...demoSection, label: "别的模块" }),
    ).toThrow(/section_type_conflict/u);
  });

  it("同一个定义重复注册是幂等的（onBoot 可能跑不止一次）", () => {
    contribute();
    expect(() => contribute()).not.toThrow();
  });

  it("CSS 随注册一起交进来，拼在内置 CSS 之后", () => {
    contribute();
    const css = loadMarketingSiteCss();
    expect(css).toContain(".demo{color:red}");
    // 拼在最后，贡献方要覆盖内置类时不必打优先级战争
    expect(css.indexOf(".demo{color:red}")).toBe(css.lastIndexOf(".demo"));
  });

  it("贡献段的 CSS 同样按需：这一页没上它就不发", () => {
    contribute();
    expect(loadMarketingSiteCssFor(new Set([TYPE]))).toContain(
      ".demo{color:red}",
    );
    expect(loadMarketingSiteCssFor(new Set(["hero"]))).not.toContain(".demo");
  });

  it("贡献段仍垫底，排在内置段之后", () => {
    contribute();
    const css = loadMarketingSiteCssFor(new Set(["hero", TYPE]));
    expect(css.indexOf(".demo{color:red}")).toBeGreaterThan(css.indexOf(".hero"));
  });
});

describe("解析", () => {
  it("注册之后，写路径按它的 schema 收下这一段", () => {
    contribute();
    const [section] = parseSections([
      { id: "s1", type: TYPE, settings: { heading: "预约" } },
    ]);
    expect(section?.type).toBe(TYPE);
    expect(settingText(section!.settings, "heading")).toBe("预约");
  });

  it("没注册时（模块没装 / 停用）读路径兜成占位，不丢内容", () => {
    const raw = { id: "s1", type: TYPE, settings: { heading: "预约" } };
    const [section] = safeSections([raw]);

    expect(section?.type).toBe("unsupported");
    expect(section?.source?.raw).toEqual(raw);
  });

  it("模块回来之后，占位自动复活成真正的段", () => {
    const raw = { id: "s1", type: TYPE, settings: { heading: "预约" } };
    const parked = safeSections([raw]);

    contribute();
    const [revived] = parseSections(parked);

    expect(revived?.type).toBe(TYPE);
    expect(settingText(revived!.settings, "heading")).toBe("预约");
    expect(revived?.source).toBeUndefined();
  });
});

describe("entitlement 闸门", () => {
  const section = {
    id: "s1",
    type: TYPE,
    settings: { heading: "预约" },
    blocks: [],
  };

  it("租户开通了才渲染", () => {
    contribute();
    const html = renderSectionHtml(section as never, 0, {
      enabledEntitlements: new Set(["tenant-demo"]),
    });
    expect(html).toContain("预约");
  });

  it("没开通就什么都不输出——不是露出半个不该看见的功能", () => {
    contribute();
    expect(
      renderSectionHtml(section as never, 0, {
        enabledEntitlements: new Set(),
      }),
    ).toBe("");
  });

  it("忘了传集合时按「都没开通」处理：少了而不是多了", () => {
    contribute();
    expect(renderSectionHtml(section as never, 0, {})).toBe("");
  });

  it("菜单同样过滤：加不出可用的东西就不该列出来", () => {
    contribute();
    expect(sectionTypesFor("page", new Set())).not.toContain(TYPE);
    expect(sectionTypesFor("page", new Set(["tenant-demo"]))).toContain(TYPE);
    // 内置段没有 entitlement，任何时候都在
    expect(sectionTypesFor("page", new Set())).toContain("hero");
  });
});
