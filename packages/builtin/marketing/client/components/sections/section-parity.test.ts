/**
 * 两端渲染的对齐守卫。
 *
 * 一段的 schema、SSR HTML、SPA 视图分在三个文件里，谁都可能只加一半：以前这是
 * 「review 时看得出来吗」的问题，现在它是红灯。测试放在 client project 是因为
 * 只有这边同时够得着 React 视图表和 SSR 渲染器表。
 */

import { describe, expect, it } from "vitest";

import {
  AREA_SECTION_TYPES,
  PAGE_SECTION_TYPES,
  RESERVED_SECTION_TYPES,
  BUILTIN_SECTION_DEFINITIONS,
} from "../../../shared/section-schema.js";
import { SECTION_HTML } from "../../../shared/sections/html.js";

import { SECTION_VIEWS } from "./section-views.js";

describe("section 两端渲染对齐", () => {
  it.each(PAGE_SECTION_TYPES)("%s 两端都有渲染器", (type) => {
    expect(SECTION_HTML[type], "缺 shared/sections/<type>/html.ts").toBeTypeOf(
      "function",
    );
    expect(
      SECTION_VIEWS[type],
      "缺 client/components/sections/views/<type>.tsx",
    ).toBeDefined();
  });

  it.each(AREA_SECTION_TYPES)("%s 是 chrome，不进段流渲染表", (type) => {
    expect(SECTION_HTML[type]).toBeUndefined();
    expect(SECTION_VIEWS[type]).toBeUndefined();
  });

  it.each(RESERVED_SECTION_TYPES)("%s 两端都不渲染", (type) => {
    // 不可用 ≠ 露出半个坏掉的段：公开页与 SSR 必须一致地什么都不输出
    expect(SECTION_HTML[type]).toBeUndefined();
    expect(SECTION_VIEWS[type]).toBeUndefined();
  });

  it.each(RESERVED_SECTION_TYPES)("%s 不出现在任何添加菜单里", (type) => {
    expect(BUILTIN_SECTION_DEFINITIONS[type].placements).toEqual([]);
  });

  it("渲染器表里没有注册表以外的段", () => {
    const known = new Set(Object.keys(BUILTIN_SECTION_DEFINITIONS));
    expect(Object.keys(SECTION_HTML).filter((t) => !known.has(t))).toEqual([]);
    expect(Object.keys(SECTION_VIEWS).filter((t) => !known.has(t))).toEqual([]);
  });
});
