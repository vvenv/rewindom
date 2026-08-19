import { beforeEach, describe, expect, it, vi } from "vitest";

import { mountTranslateWidget, type MountWidgetOptions } from "./widget.js";

/** 完整页面骨架：吸顶页头 + 语言菜单 + 正文。 */
const FULL_PAGE = `<div class="site-stack">
  <header class="site-header sticky">
    <div class="chrome-zone-end"><div class="chrome-pins">
      <div class="chrome-block"><details class="locale-switcher">
        <summary class="chrome-control"></summary>
        <nav class="locale-switcher-menu"><a href="/en">EN</a></nav>
      </details></div>
    </div></div>
  </header>
  <main class="site-main"><p>x</p></main>
</div>`;

/** 单语言站：没有语言切换器（`renderLocaleHtml` 在只有一种语言时返回空）。 */
const NO_LOCALE_MENU = `<div class="site-stack">
  <header class="site-header"><div class="chrome-zone-end"><div class="chrome-pins"></div></div></header>
  <main class="site-main"><p>x</p></main>
</div>`;

function mount(overrides: Partial<MountWidgetOptions> = {}) {
  return mountTranslateWidget({
    locale: "zh-CN",
    offer: false,
    onToggle: () => {},
    onDismissOffer: () => {},
    ...overrides,
  });
}

const menuItem = (): HTMLButtonElement | null =>
  document.querySelector(".rw-translate-menu-item");
const pin = (): HTMLButtonElement | null => document.querySelector(".rw-translate-pin");
const bar = (): HTMLElement | null => document.querySelector(".rw-translate-bar");
const barText = (): HTMLElement | null =>
  document.querySelector(".rw-translate-bar-text");
const barAction = (): HTMLButtonElement | null =>
  document.querySelector(".rw-translate-bar .rw-translate-action");
const offer = (): HTMLElement | null => document.querySelector(".rw-translate-offer");

beforeEach(() => {
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  document.documentElement.removeAttribute("style");
});

describe("常驻入口的位置", () => {
  it("首选语言菜单 —— 翻译就是「把这页变成我的语言」，读者会去开的就是那个菜单", () => {
    document.body.innerHTML = FULL_PAGE;
    mount();
    const menu = document.querySelector(".locale-switcher-menu") as HTMLElement;
    expect(menu.contains(menuItem())).toBe(true);
    expect(menuItem()?.textContent).toBe("翻译此页正文");
    // 菜单里有位置就不再往页头图标行里塞
    expect(pin()).toBeNull();
  });

  it("菜单项点完把 details 收起来 —— marketing 的收起脚本只认菜单外的 pointerdown", () => {
    document.body.innerHTML = FULL_PAGE;
    const details = document.querySelector("details") as HTMLDetailsElement;
    details.setAttribute("open", "");
    const onToggle = vi.fn();
    mount({ onToggle });
    menuItem()?.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(details.hasAttribute("open")).toBe(false);
  });

  it("单语言站没有语言菜单时回落页头图标，且是定宽的 —— 状态文案一律不进页头", () => {
    document.body.innerHTML = NO_LOCALE_MENU;
    const widget = mount();
    expect(pin()).toBeTruthy();
    expect(pin()?.classList.contains("chrome-control")).toBe(true);
    // 定宽的前提：按钮里没有 span，`.chrome-control:not(:has(span))` 才给方框
    expect(pin()?.querySelector("span")).toBeNull();
    widget.setState("working", { done: 2, total: 5 });
    expect(pin()?.textContent?.trim()).toBe("");
    expect(pin()?.getAttribute("aria-label")).toBe("翻译中…");
  });

  it("连页头都没有时回落浮标 —— 任何页面都要有入口", () => {
    document.body.innerHTML = `<main class="site-main"><p>x</p></main>`;
    mount();
    expect(document.querySelector(".rw-translate-floating")).toBeTruthy();
  });

  it("入口自身带 translate=no —— 否则浏览器整页翻译会把「显示原文」也翻掉", () => {
    document.body.innerHTML = FULL_PAGE;
    mount({ offer: true });
    expect(menuItem()?.getAttribute("translate")).toBe("no");
    expect(bar()?.getAttribute("translate")).toBe("no");
    expect(offer()?.getAttribute("translate")).toBe("no");
  });
});

describe("状态条", () => {
  it("是 main 的兄弟且排在它前面 —— 塞进 main 会继承内边距，露出左边一道对不齐的空白", () => {
    document.body.innerHTML = FULL_PAGE;
    mount();
    const main = document.querySelector("main.site-main") as HTMLElement;
    expect(bar()?.parentElement).toBe(main.parentElement);
    expect(bar()?.nextElementSibling).toBe(main);
    // 页头图标行里一个状态文案都不许有
    expect(document.querySelector(".chrome-pins .rw-translate-bar")).toBeNull();
  });

  it("idle 时不占位", () => {
    document.body.innerHTML = FULL_PAGE;
    const widget = mount();
    widget.setState("idle");
    expect(bar()?.hidden).toBe(true);
  });

  it("下载态显示百分比，入口不可点 —— 首次翻译要下几十 MB", () => {
    document.body.innerHTML = FULL_PAGE;
    const widget = mount();
    widget.setState("downloading", { ratio: 0.42 });
    expect(bar()?.hidden).toBe(false);
    expect(barText()?.textContent).toContain("42%");
    expect(menuItem()?.disabled).toBe(true);
    expect(barAction()?.hidden).toBe(true);
  });

  it("翻译中显示批次进度", () => {
    document.body.innerHTML = FULL_PAGE;
    const widget = mount();
    widget.setState("working", { done: 2, total: 5 });
    expect(barText()?.textContent).toContain("2/5");
    expect(menuItem()?.disabled).toBe(true);
  });

  it("成功后亮机器翻译声明，「显示原文」在状态条上", () => {
    document.body.innerHTML = FULL_PAGE;
    const widget = mount();
    widget.setState("translated");
    expect(barText()?.textContent).toBe("机器翻译，以原文为准");
    expect(barAction()?.hidden).toBe(false);
    expect(barAction()?.textContent).toBe("显示原文");
    expect(menuItem()?.textContent).toBe("显示原文");
    expect(menuItem()?.getAttribute("aria-pressed")).toBe("true");
  });

  /** 回归测试：一个字都没译出来却显示「显示原文」，会掩盖故障。 */
  it("失败态绝不能显示「显示原文」，也不亮机器翻译声明", () => {
    document.body.innerHTML = FULL_PAGE;
    const widget = mount();
    widget.setState("failed");
    expect(barText()?.textContent).toBe("翻译未成功");
    expect(barAction()?.textContent).toBe("重试");
    expect(menuItem()?.textContent).not.toBe("显示原文");
    expect(menuItem()?.getAttribute("aria-pressed")).toBe("false");
    expect(menuItem()?.disabled).toBe(false);
  });

  it("状态变化播报给读屏器 —— 只改按钮 label 的话读屏器不会主动念", () => {
    document.body.innerHTML = FULL_PAGE;
    mount();
    expect(barText()?.getAttribute("role")).toBe("status");
    expect(barText()?.getAttribute("aria-live")).toBe("polite");
  });

  it("吸顶页头在场时量出偏移量 —— 否则状态条被压在页头下面", () => {
    document.body.innerHTML = FULL_PAGE;
    const header = document.querySelector(".site-header") as HTMLElement;
    header.getBoundingClientRect = () => ({ height: 64 }) as DOMRect;
    mount();
    expect(
      document.documentElement.style.getPropertyValue("--rw-translate-top"),
    ).toBe("64px");
  });

  it("页头不吸顶时偏移量是 0 —— 它自己会滚走", () => {
    document.body.innerHTML = NO_LOCALE_MENU;
    mount();
    expect(
      document.documentElement.style.getPropertyValue("--rw-translate-top"),
    ).toBe("0px");
  });
});

describe("一次性提议", () => {
  it("不占文档流 —— 没请自来的 UI 不许把正文推下去", () => {
    document.body.innerHTML = FULL_PAGE;
    mount({ offer: true });
    const main = document.querySelector("main.site-main") as HTMLElement;
    // 挂在 body 末尾、fixed 覆盖，不是 main 的前置兄弟
    expect(offer()?.parentElement).toBe(document.body);
    expect(main.previousElementSibling).toBe(bar());
  });

  it("offer=false 时根本不出现 —— 上一页开着翻译、或这一会话关过，都不该再问", () => {
    document.body.innerHTML = FULL_PAGE;
    mount({ offer: false });
    expect(offer()).toBeNull();
  });

  it("「译成中文」走同一个 toggle", () => {
    document.body.innerHTML = FULL_PAGE;
    const onToggle = vi.fn();
    mount({ offer: true, onToggle });
    (offer()?.querySelector(".rw-translate-accept") as HTMLButtonElement).click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("「不用了」收掉横幅并回调 —— 能力还在语言菜单里", () => {
    document.body.innerHTML = FULL_PAGE;
    const onDismissOffer = vi.fn();
    mount({ offer: true, onDismissOffer });
    const buttons = offer()?.querySelectorAll(".rw-translate-action");
    (buttons?.[1] as HTMLButtonElement).click();
    expect(offer()).toBeNull();
    expect(onDismissOffer).toHaveBeenCalledTimes(1);
    expect(menuItem()).toBeTruthy();
  });

  it("和浮标抢右下角时把浮标抬上去", () => {
    document.body.innerHTML = `<main class="site-main"><p>x</p></main>`;
    const widget = mount({ offer: true });
    const floating = document.querySelector(".rw-translate-floating") as HTMLElement;
    expect(floating.classList.contains("rw-translate-raised")).toBe(true);
    widget.setState("working", { done: 0, total: 1 });
    expect(floating.classList.contains("rw-translate-raised")).toBe(false);
  });

  it("一开始翻译就收掉 —— 说话的换成状态条了", () => {
    document.body.innerHTML = FULL_PAGE;
    const widget = mount({ offer: true });
    widget.setState("idle");
    expect(offer()).toBeTruthy();
    widget.setState("working", { done: 0, total: 3 });
    expect(offer()).toBeNull();
  });
});

describe("destroy", () => {
  it("三个面一起清干净，页头不留空壳", () => {
    document.body.innerHTML = NO_LOCALE_MENU;
    const widget = mount({ offer: true });
    widget.destroy();
    expect(document.querySelector(".rw-translate-bar")).toBeNull();
    expect(document.querySelector(".rw-translate-offer")).toBeNull();
    expect(document.querySelector(".rw-translate-pin")).toBeNull();
    expect(document.querySelector(".chrome-pins")?.children.length).toBe(0);
    expect(
      document.documentElement.style.getPropertyValue("--rw-translate-top"),
    ).toBe("");
  });

  it("菜单项连同分隔线一起清掉", () => {
    document.body.innerHTML = FULL_PAGE;
    const widget = mount();
    widget.destroy();
    expect(menuItem()).toBeNull();
    expect(document.querySelector(".rw-translate-menu-sep")).toBeNull();
    expect(document.querySelectorAll(".locale-switcher-menu > *").length).toBe(1);
  });
});
