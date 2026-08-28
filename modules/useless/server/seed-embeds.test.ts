import { describe, expect, it } from "vitest";

import { SEED_EMBEDS } from "./seed-embeds.js";

/**
 * 这些东西**直接注入官网页面**，没有 iframe 边界。所以作用域是靠约定守的，
 * 这组测试就是那个约定的执行者——违反了会把整站的版式或事件一起改掉。
 */
describe("可交互物必须守住自己的作用域", () => {
  for (const embed of SEED_EMBEDS) {
    describe(embed.title, () => {
      const styles = [...embed.html.matchAll(/<style>([\s\S]*?)<\/style>/g)]
        .map((m) => m[1])
        .join("\n");
      const scripts = [...embed.html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
        .map((m) => m[1])
        .join("\n");

      it("CSS 选择器全部收在 .useless-thing 里", () => {
        const selectors = styles
          .split("}")
          .map((chunk) => chunk.split("{")[0].trim())
          .filter(Boolean);
        for (const sel of selectors) {
          // `@media` 之类的 at-rule 不是选择器
          if (sel.startsWith("@")) continue;
          expect(sel, `越界的选择器：${sel}`).toMatch(/^\.useless-thing\b/);
        }
      });

      it("不往 document / window 上绑事件", () => {
        // 绑在 document 上会收到整页的点击，读者点导航也会触发它
        expect(scripts).not.toMatch(/document\s*\.\s*addEventListener/);
        expect(scripts).not.toMatch(/window\s*\.\s*addEventListener/);
        expect(scripts).not.toMatch(/document\s*\.\s*on\w+\s*=/);
      });

      it("只在自己的容器内查元素", () => {
        // 全局查询会在同一页摆两个时抓到别人那一个
        expect(scripts).not.toMatch(/document\s*\.\s*getElementById/);
        expect(scripts).not.toMatch(/document\s*\.\s*querySelector/);
        expect(scripts).toContain("currentScript.parentNode");
      });

      it("脚本包在 IIFE 里，不往全局漏变量", () => {
        expect(scripts.trim()).toMatch(/^\(function\s*\(\)\s*\{/);
      });

      it("语法正确", () => {
        expect(() => new Function(scripts)).not.toThrow();
      });
    });
  }

  it("标题互不重复 —— seed 靠标题查重", () => {
    const titles = SEED_EMBEDS.map((e) => e.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
