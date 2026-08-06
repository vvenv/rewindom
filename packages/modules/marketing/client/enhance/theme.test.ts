import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { enhanceTheme } from "./theme.js";

describe("enhanceTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-site-color-mode");
    document.documentElement.style.colorScheme = "";
    localStorage.clear();
    document.body.innerHTML =
      '<button type="button" class="theme-toggle" title="x">sun</button>';
    enhanceTheme();
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("点击在 light / dark 间切换并写 storage", () => {
    const button = document.querySelector("button.theme-toggle")!;
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const first = localStorage.getItem("site-color-mode");
    expect(first === "light" || first === "dark").toBe(true);
    expect(document.documentElement.getAttribute("data-site-color-mode")).toBe(
      first,
    );

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const second = localStorage.getItem("site-color-mode");
    expect(second).toBe(first === "dark" ? "light" : "dark");
    expect(document.documentElement.getAttribute("data-site-color-mode")).toBe(
      second,
    );
  });
});
