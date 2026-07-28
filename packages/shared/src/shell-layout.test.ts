import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHELL_LAYOUT,
  SHELL_LAYOUTS,
  getShellLayoutLabel,
  isShellLayoutSlug,
  normalizeOptionalShellLayout,
  normalizeShellLayout,
} from "./shell-layout.js";

describe("shell-layout", () => {
  it("注册表里的 slug 唯一，且默认布局在册", () => {
    const slugs = SHELL_LAYOUTS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain(DEFAULT_SHELL_LAYOUT);
  });

  it("isShellLayoutSlug 只认注册过的字符串", () => {
    expect(isShellLayoutSlug("sidebar")).toBe(true);
    expect(isShellLayoutSlug("topbar")).toBe(true);
    expect(isShellLayoutSlug("diagonal")).toBe(false);
    expect(isShellLayoutSlug(null)).toBe(false);
    expect(isShellLayoutSlug(1)).toBe(false);
  });

  it("normalizeShellLayout 把非法值收敛到 fallback", () => {
    expect(normalizeShellLayout("topbar")).toBe("topbar");
    expect(normalizeShellLayout(undefined)).toBe(DEFAULT_SHELL_LAYOUT);
    expect(normalizeShellLayout("diagonal")).toBe(DEFAULT_SHELL_LAYOUT);
    expect(normalizeShellLayout("diagonal", "topbar")).toBe("topbar");
  });

  it("normalizeOptionalShellLayout 用 null 表示继承", () => {
    expect(normalizeOptionalShellLayout("topbar")).toBe("topbar");
    // 空串是 UI 里「跟随默认 / 继承」的哨兵值
    expect(normalizeOptionalShellLayout("")).toBeNull();
    expect(normalizeOptionalShellLayout("diagonal")).toBeNull();
    expect(normalizeOptionalShellLayout(undefined)).toBeNull();
  });

  it("getShellLayoutLabel 未知 slug 原样返回", () => {
    expect(getShellLayoutLabel("sidebar")).toBe("左右");
    expect(getShellLayoutLabel("topbar")).toBe("上下");
    expect(getShellLayoutLabel("diagonal")).toBe("diagonal");
  });
});
