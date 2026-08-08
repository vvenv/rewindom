/**
 * 段样式互不越界——SSR 按需发 CSS 的前提。
 *
 * 逻辑在 `check-section-css.mjs`（也是 `pnpm check:section-css` 的实现），这里让它
 * 跟着 `pnpm test` 一起跑：越界在改动当下就该红，而不是等谁想起来跑那条命令。
 */

import { describe, expect, it } from "vitest";

import { findSectionCssViolations } from "./check-section-css.mjs";

describe("段样式作用域", () => {
  it("一个段定义的类只有这个段自己用", () => {
    // 报错信息里直接写了怎么改（挪进 _common，或在本段自带一份）
    expect(findSectionCssViolations()).toEqual([]);
  });
});
