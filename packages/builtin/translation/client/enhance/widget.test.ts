import { beforeEach, describe, expect, it, vi } from "vitest";

import { mountTranslateWidget } from "./widget.js";

function button(): HTMLButtonElement {
  return document.querySelector(".rw-translate") as HTMLButtonElement;
}

beforeEach(() => {
  document.body.innerHTML = "";
  document.head.innerHTML = "";
});

describe("mountTranslateWidget", () => {
  it("控件自身带 translate=no —— 否则浏览器整页翻译会把「显示原文」也翻掉", () => {
    mountTranslateWidget("zh-CN", () => {});
    expect(button().getAttribute("translate")).toBe("no");
    expect(
      document.querySelector(".rw-translate-note")?.getAttribute("translate"),
    ).toBe("no");
  });

  it("下载态显示百分比且不可点 —— 首次翻译要下几十 MB", () => {
    const widget = mountTranslateWidget("zh-CN", () => {});
    widget.setState("downloading", { ratio: 0.42 });
    expect(button().textContent).toContain("42%");
    expect(button().disabled).toBe(true);
  });

  it("翻译中显示批次进度", () => {
    const widget = mountTranslateWidget("zh-CN", () => {});
    widget.setState("working", { done: 2, total: 5 });
    expect(button().textContent).toContain("2/5");
    expect(button().disabled).toBe(true);
  });

  it("成功后是「显示原文」，并亮出机器翻译提示", () => {
    const widget = mountTranslateWidget("zh-CN", () => {});
    widget.setState("translated");
    expect(button().textContent).toBe("显示原文");
    expect(button().getAttribute("aria-pressed")).toBe("true");
    expect(
      (document.querySelector(".rw-translate-note") as HTMLElement).hidden,
    ).toBe(false);
  });

  /** 回归测试：一个字都没译出来却显示「显示原文」，会掩盖故障。 */
  it("失败态绝不能显示「显示原文」，也不亮机器翻译提示", () => {
    const widget = mountTranslateWidget("zh-CN", () => {});
    widget.setState("failed");
    expect(button().textContent).not.toBe("显示原文");
    expect(button().textContent).toContain("重试");
    expect(button().getAttribute("aria-pressed")).toBe("false");
    expect(
      (document.querySelector(".rw-translate-note") as HTMLElement).hidden,
    ).toBe(true);
    expect(button().disabled).toBe(false);
  });

  it("点击回调透传", () => {
    const onToggle = vi.fn();
    mountTranslateWidget("zh-CN", onToggle);
    button().click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("destroy 清干净", () => {
    const widget = mountTranslateWidget("zh-CN", () => {});
    widget.destroy();
    expect(document.querySelector(".rw-translate")).toBeNull();
    expect(document.querySelector(".rw-translate-note")).toBeNull();
  });
});

describe("挂载位置", () => {
  it("有页头时挂进控件区，与语言/主题开关并排，且排在最前", () => {
    document.body.innerHTML = `<header class="site-header"><div class="chrome-zone-end"><div class="chrome-pins"><div class="chrome-block" id="locale"></div></div></div></header><main class="site-main"><p>x</p></main>`;
    mountTranslateWidget("zh-CN", () => {});
    const pins = document.querySelector(".chrome-pins") as HTMLElement;
    expect(pins.firstElementChild?.querySelector(".rw-translate")).toBeTruthy();
    expect(button().classList.contains("chrome-control")).toBe(true);
    // 页头里不该出现浮标样式
    expect(button().classList.contains("rw-translate-floating")).toBe(false);
  });

  it("机器翻译声明贴在正文顶部，不塞进页头图标行", () => {
    document.body.innerHTML = `<header class="site-header"><div class="chrome-zone-end"><div class="chrome-pins"></div></div></header><main class="site-main"><p>x</p></main>`;
    mountTranslateWidget("zh-CN", () => {});
    const note = document.querySelector(".rw-translate-note") as HTMLElement;
    expect(note.parentElement?.classList.contains("site-main")).toBe(true);
    expect(document.querySelector(".chrome-pins .rw-translate-note")).toBeNull();
  });

  it("没有页头时回落浮标 —— 任何页面都要有入口", () => {
    document.body.innerHTML = "";
    mountTranslateWidget("zh-CN", () => {});
    expect(button().classList.contains("rw-translate-floating")).toBe(true);
    expect(button().parentElement).toBe(document.body);
  });

  it("destroy 连同 chrome-block 一起清掉，不留空壳", () => {
    document.body.innerHTML = `<header class="site-header"><div class="chrome-zone-end"><div class="chrome-pins"></div></div></header>`;
    const widget = mountTranslateWidget("zh-CN", () => {});
    widget.destroy();
    expect(document.querySelector(".chrome-pins")?.children.length).toBe(0);
  });
});

describe("机器翻译声明的位置", () => {
  it("贴在正文顶部，不塞进页头图标行 —— 塞进去会和相邻图标叠住", () => {
    document.body.innerHTML = `<header class="site-header"><div class="chrome-zone-end"><div class="chrome-pins"></div></div></header><main class="site-main"><p>x</p></main>`;
    mountTranslateWidget("zh-CN", () => {});
    const note = document.querySelector(".rw-translate-note") as HTMLElement;
    expect(note.parentElement?.classList.contains("site-main")).toBe(true);
    expect(document.querySelector(".chrome-pins .rw-translate-note")).toBeNull();
  });
});
