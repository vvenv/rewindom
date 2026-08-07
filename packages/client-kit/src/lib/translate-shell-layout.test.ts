import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";

import { SHELL_LAYOUTS, getShellLayoutLabel } from "@be-water/shared";

import {
  translateShellLayoutLabel,
  translateShellLayoutOptions,
} from "./translate-shell-layout.js";

/** 造一个最小 TFunction:命中翻译返回翻译值,否则返回 defaultValue,再否则返回 key。 */
function makeT(map: Record<string, string>) {
  return vi.fn(
    (
      key: string,
      opts?: { defaultValue?: string },
    ): string => map[key] ?? opts?.defaultValue ?? key,
  ) as unknown as TFunction;
}

describe("translate-shell-layout", () => {
  describe("translateShellLayoutLabel", () => {
    it("命中翻译时返回翻译值", () => {
      const t = makeT({ "shellLayouts.sidebar.label": "Sidebar" });
      expect(translateShellLayoutLabel(t, "sidebar")).toBe("Sidebar");
      expect(t).toHaveBeenCalledWith(
        "shellLayouts.sidebar.label",
        expect.objectContaining({ ns: "shell", defaultValue: "左右" }),
      );
    });

    it("翻译缺失时回落到 shared 的 zh-CN label", () => {
      const t = makeT({});
      expect(translateShellLayoutLabel(t, "topbar")).toBe("上下");
    });

    it("未知 slug 回落到 slug 本身", () => {
      const t = makeT({});
      expect(translateShellLayoutLabel(t, "ghost")).toBe("ghost");
    });
  });

  describe("translateShellLayoutOptions", () => {
    it("返回所有布局,每项带 slug/label/description", () => {
      const t = makeT({
        "shellLayouts.sidebar.label": "Sidebar",
        "shellLayouts.topbar.description": "Top nav layout",
      });

      const options = translateShellLayoutOptions(t);

      expect(options).toHaveLength(SHELL_LAYOUTS.length);
      const slugs = options.map((o) => o.slug);
      expect(slugs).toEqual(["sidebar", "topbar"]);

      // 命中的用翻译值
      const sidebar = options.find((o) => o.slug === "sidebar")!;
      expect(sidebar.label).toBe("Sidebar");
      // label 缺失翻译回落 zh-CN
      expect(sidebar.description).toBe(
        "左侧边栏 + 右侧内容区，导航项多时更从容，可收起为图标条",
      );

      // description 命中翻译
      const topbar = options.find((o) => o.slug === "topbar")!;
      expect(topbar.description).toBe("Top nav layout");
      // topbar label 缺失翻译回落
      expect(topbar.label).toBe(getShellLayoutLabel("topbar"));
    });
  });
});
