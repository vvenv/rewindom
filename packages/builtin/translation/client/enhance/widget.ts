/**
 * 公开站的翻译界面（无 React，无外部 CSS）—— **三个面，各司其职**。
 *
 * 翻译是**文档级动作**，不是站点级设置：它作用于这一篇正文，可用性逐页变化
 * （正文本来就是中文的页面根本不出现），状态每次导航重置。页头里的东西恰好
 * 相反——跨页常驻、配置的是站点。把前者塞进后者是范畴错误，症状就是那颗按钮
 * 既要短到能进图标行、又要长到能显示「正在准备翻译模型…42%」。
 *
 * 所以拆成三个：
 *
 * | 面 | 职责 | 在哪 |
 * | --- | --- | --- |
 * | 提议横幅 | 会话内**教一次**：这页有外文，可以翻 | 贴底覆盖层，不占文档流 |
 * | 常驻入口 | 永远够得着的开关 | 语言菜单里（兜底：页头图标 → 浮标） |
 * | 状态条 | 进度、失败、机器翻译声明、显示原文 | 正文顶部，吸顶 |
 *
 * 入口挂进**语言菜单**是这次的关键：翻译本就是「把这页变成我的语言」，读者要
 * 找它时开的就是那个菜单；弹层里放多长文案都不挤任何东西，站长在 Theme Editor
 * 里怎么摆语言块它就跟到哪，窄屏收进抽屉也一起收。
 *
 * 位移的两条规矩：**没请自来的 UI 不许推动正文**（提议横幅是 fixed 覆盖层），
 * **读者点出来的可以**（状态条在流内，用户手势 500ms 内的位移不计入 CLS）。
 *
 * 样式由脚本注入而不是走 marketing 的段 CSS 管线：控件不是一个「段」，段样式
 * 只在页面用到该段时才下发；而且只有翻译开着时才需要这几行 CSS。
 */

import { widgetMessages } from "../../shared/messages.js";

import type { AppLocale } from "@rewindom/shared";

const STYLE_ID = "rw-translate-style";

/** 常驻入口的首选位置：语言切换器的下拉。 */
const MENU_SLOT = ".site-header .locale-switcher-menu";
/** 兜底一：页头控件区。marketing 的 chrome 结构。 */
const PIN_SLOT = ".site-header .chrome-zone-end .chrome-pins";
/** 吸顶偏移量：状态条与提议横幅都贴在吸顶页头的下沿。 */
const OFFSET_VAR = "--rw-translate-top";

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`;

/*
 * 配色一律走站点主题的 token（`--fg` / `--surface` / `--border` …，定义在
 * `marketing-site-theme.ts`）。写死的 `#fff` 只作为 token 缺失时的兜底——
 * 这里曾经用过一套 `--site-*` 变量，那些名字在仓库里根本不存在，于是深色主题下
 * 每次都落到白底黑字。
 */
const CSS = `
.rw-translate-bar,
.rw-translate-offer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: .5rem .75rem;
  padding: .4375rem 1rem;
  font-size: .8125rem;
  line-height: 1.4;
}
.rw-translate-bar[hidden],
.rw-translate-offer[hidden] { display: none; }
/*
 * 状态条：**流内 + 吸顶**。流内是因为它由读者的点击带出来，位移正当；吸顶是
 * 因为只要页面上还有译文，「这是机器翻译」就得一直看得见——贴在 main 前面不吸顶
 * 的话，声明只在首屏有效，读者往下滚就再也看不到自己读的不是原文。
 */
.rw-translate-bar {
  position: sticky;
  top: var(${OFFSET_VAR}, 0px);
  z-index: 39;
  color: var(--muted-fg, #666);
  background: var(--muted-bg, rgba(127,127,127,.08));
  border-bottom: 1px solid var(--border, rgba(127,127,127,.18));
}
.rw-translate-bar-text { margin: 0; }
/*
 * 提议横幅：**贴底的覆盖层**。
 *
 * 覆盖层是因为它没请自来——插进文档流就是整页下推一次，一次白给的 CLS，还正好
 * 发生在读者刚开始读的那一刻。贴底是因为顶上两样东西都惹不起：页头吸顶时它得
 * 让位，页头不吸顶时盖上去就是把导航挡住；而正文最上面那一段恰恰是最该看见的。
 * 底部谁都不挡，也是这类「可关掉的一次性提示」的常规位置。
 */
.rw-translate-offer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  color: var(--fg, #111);
  background: var(--surface, #fff);
  border-top: 1px solid var(--border, rgba(127,127,127,.18));
  box-shadow: 0 -4px 16px rgba(0,0,0,.08);
}
.rw-translate-action {
  font: inherit;
  padding: .125rem .5rem;
  border: 1px solid var(--border, rgba(127,127,127,.3));
  border-radius: .375rem;
  background: transparent;
  color: var(--fg, #111);
  white-space: nowrap;
  cursor: pointer;
}
.rw-translate-action:hover { background: var(--muted-bg, rgba(127,127,127,.12)); }
.rw-translate-accept {
  border-color: transparent;
  background: var(--accent, #111);
  color: var(--accent-fg, #fff);
}
.rw-translate-accept:hover { opacity: .9; background: var(--accent, #111); }
/* 语言菜单里的那一项：照抄相邻链接的形状，只是它是个 button */
.rw-translate-menu-item {
  display: block;
  width: 100%;
  padding: .375rem .625rem;
  border: 0;
  border-radius: .375rem;
  background: transparent;
  font: inherit;
  font-size: .875rem;
  color: var(--muted-fg, #666);
  text-align: start;
  white-space: nowrap;
  cursor: pointer;
}
.rw-translate-menu-item:hover:not(:disabled) {
  background: var(--muted-bg, rgba(127,127,127,.12));
  color: var(--fg, #111);
}
.rw-translate-menu-item:disabled { cursor: progress; opacity: .7; }
/* 与上面那组「界面语言」的链接分开：它们不是同一件事 */
.rw-translate-menu-sep {
  height: 1px;
  margin: .25rem;
  background: var(--border, rgba(127,127,127,.18));
}
/* 兜底入口：定宽图标，文案全在 title / aria-label 上，不参与页头的宽度竞争 */
.rw-translate-pin {
  border: 0;
  background: transparent;
  cursor: pointer;
}
.rw-translate-pin:disabled { cursor: progress; opacity: .7; }
.rw-translate-floating {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  border: 1px solid var(--border, rgba(127,127,127,.3));
  background: var(--surface, #fff);
  color: var(--fg, #111);
  box-shadow: 0 2px 12px rgba(0,0,0,.12);
  cursor: pointer;
}
/* 提议横幅在场时把浮标抬上去——两个都在右下角，否则叠在一起 */
.rw-translate-floating.rw-translate-raised { bottom: 4rem; }
@media (max-width: 640px) {
  .rw-translate-floating { right: .75rem; bottom: .75rem; }
  .rw-translate-floating.rw-translate-raised { bottom: 4rem; }
}
`;

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export type WidgetState =
  | "idle"
  | "downloading"
  | "working"
  | "translated"
  | "failed";

export type WidgetProgress = { done: number; total: number } | { ratio: number };

export interface MountWidgetOptions {
  locale: AppLocale;
  /** 会话内还没被读者关掉、且不是从上一页续开的，才给一次主动提议。 */
  offer: boolean;
  /** 提议横幅的「译成中文」、菜单项、状态条的「显示原文」/「重试」都走它。 */
  onToggle(): void;
  /** 读者点了「不用了」：这一会话不再提议。 */
  onDismissOffer(): void;
}

export interface TranslateWidget {
  setState(state: WidgetState, progress?: WidgetProgress): void;
  destroy(): void;
}

/** 常驻入口的三种形态共用的接口。 */
interface Entry {
  update(label: string, pressed: boolean, busy: boolean): void;
  /** 只有浮标要实现：它和提议横幅抢同一个右下角。 */
  raise?(on: boolean): void;
  destroy(): void;
}

function actionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rw-translate-action";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

/**
 * 吸顶偏移：状态条与提议横幅要贴在**吸顶页头**的下沿，否则会被压在它下面。
 *
 * 页头不吸顶（站长关了 `sticky`）时偏移就是 0——那时页头自己会滚走，正文顶部
 * 就是视口顶部。高度是响应式的（窄屏换行、抽屉展开），所以要跟着量。
 */
function trackHeaderOffset(): () => void {
  const header = document.querySelector<HTMLElement>(".site-header.sticky");
  const root = document.documentElement;
  if (!header) {
    root.style.setProperty(OFFSET_VAR, "0px");
    return () => root.style.removeProperty(OFFSET_VAR);
  }
  const sync = (): void => {
    const height = Math.round(header.getBoundingClientRect().height);
    root.style.setProperty(OFFSET_VAR, `${height}px`);
  };
  sync();
  if (typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      root.style.removeProperty(OFFSET_VAR);
    };
  }
  const observer = new ResizeObserver(sync);
  observer.observe(header);
  return () => {
    observer.disconnect();
    root.style.removeProperty(OFFSET_VAR);
  };
}

/**
 * 首选入口：语言切换器的下拉里加一项。
 *
 * 点完要**手动关掉 `<details>`**：marketing 的收起脚本只认菜单外的
 * `pointerdown`，点在菜单里的按钮上它不会收，读者会看着一个开着的空菜单。
 */
function mountMenuEntry(onToggle: () => void): Entry | null {
  const menu = document.querySelector(MENU_SLOT);
  if (!menu) return null;
  const separator = document.createElement("div");
  separator.className = "rw-translate-menu-sep";
  const item = document.createElement("button");
  item.type = "button";
  item.className = "rw-translate-menu-item";
  item.setAttribute("translate", "no");
  item.addEventListener("click", () => {
    menu.closest("details")?.removeAttribute("open");
    onToggle();
  });
  menu.append(separator, item);
  return {
    update(label, pressed, busy) {
      item.textContent = label;
      item.disabled = busy;
      item.setAttribute("aria-pressed", String(pressed));
    },
    destroy() {
      separator.remove();
      item.remove();
    },
  };
}

/**
 * 兜底入口：页头控件区里一颗**定宽图标**。
 *
 * 单语言站没有语言切换器（`renderLocaleHtml` 在只有一种语言时返回空），这时
 * 页头是唯一还说得过去的常驻位置。它只是入口，所有状态文案都在状态条上，
 * 所以这颗按钮永远是 2rem 见方，不会像以前那样跟着状态忽宽忽窄挤掉品牌位。
 */
function mountPinEntry(onToggle: () => void): Entry | null {
  const pins = document.querySelector(PIN_SLOT);
  if (!pins) return null;
  const block = document.createElement("div");
  block.className = "chrome-block";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chrome-control rw-translate-pin";
  button.innerHTML = ICON;
  button.setAttribute("translate", "no");
  button.addEventListener("click", onToggle);
  block.append(button);
  pins.prepend(block);
  return {
    update(label, pressed, busy) {
      button.title = label;
      button.setAttribute("aria-label", label);
      button.disabled = busy;
      button.setAttribute("aria-pressed", String(pressed));
    },
    destroy() {
      block.remove();
    },
  };
}

/** 兜底二：连页头都没有（裸段落页、会员闸门页）时的浮标。 */
function mountFloatingEntry(onToggle: () => void): Entry {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rw-translate-floating";
  button.innerHTML = ICON;
  button.setAttribute("translate", "no");
  button.addEventListener("click", onToggle);
  document.body.append(button);
  return {
    update(label, pressed, busy) {
      button.title = label;
      button.setAttribute("aria-label", label);
      button.disabled = busy;
      button.setAttribute("aria-pressed", String(pressed));
    },
    raise(on) {
      button.classList.toggle("rw-translate-raised", on);
    },
    destroy() {
      button.remove();
    },
  };
}

/**
 * 状态条：正文顶部，`main` 的**兄弟**。
 *
 * 塞进 `main` 会跟着继承内边距，露出左边一道对不齐的空白；作为 stack 的直接
 * 子元素才拿得到整幅宽度。文字部分是 `role="status"`（隐含 `aria-live=polite`），
 * 读屏器才知道「翻完了」——以前只改按钮 label，读屏器不会主动念。按钮留在活区
 * 之外，否则每次状态变化都会把按钮文案一起重念一遍。
 */
function mountBar(): { bar: HTMLElement; text: HTMLElement } {
  const bar = document.createElement("div");
  bar.className = "rw-translate-bar";
  bar.setAttribute("translate", "no");
  bar.hidden = true;
  const text = document.createElement("p");
  text.className = "rw-translate-bar-text";
  text.setAttribute("role", "status");
  text.setAttribute("aria-live", "polite");
  bar.append(text);

  const main = document.querySelector("main.site-main");
  if (main?.parentElement) main.parentElement.insertBefore(bar, main);
  else document.body.prepend(bar);
  return { bar, text };
}

export function mountTranslateWidget(
  options: MountWidgetOptions,
): TranslateWidget {
  injectStyle();
  const messages = widgetMessages(options.locale);
  const stopTracking = trackHeaderOffset();

  const entry =
    mountMenuEntry(options.onToggle) ??
    mountPinEntry(options.onToggle) ??
    mountFloatingEntry(options.onToggle);

  const { bar, text } = mountBar();
  const barAction = actionButton("", options.onToggle);
  barAction.hidden = true;
  bar.append(barAction);

  let offer: HTMLElement | null = null;
  const removeOffer = (): void => {
    if (!offer) return;
    offer.remove();
    offer = null;
    entry.raise?.(false);
  };
  if (options.offer) {
    offer = document.createElement("div");
    offer.className = "rw-translate-offer";
    offer.setAttribute("translate", "no");
    const label = document.createElement("span");
    label.textContent = messages.offerText;
    const accept = actionButton(messages.offerAccept, options.onToggle);
    accept.classList.add("rw-translate-accept");
    const dismiss = actionButton(messages.offerDismiss, () => {
      removeOffer();
      options.onDismissOffer();
    });
    offer.append(label, accept, dismiss);
    document.body.append(offer);
    entry.raise?.(true);
  }

  const widget: TranslateWidget = {
    setState(state, progress) {
      // 提议只在「还没开始」时有意义：一旦动起来，说话的就是状态条了
      if (state !== "idle") removeOffer();

      const busy = state === "working" || state === "downloading";
      const pressed = state === "translated";
      entry.update(
        pressed ? messages.showOriginal : busy ? messages.translating : messages.translate,
        pressed,
        busy,
      );

      bar.hidden = state === "idle";
      if (state === "downloading") {
        const ratio =
          progress && "ratio" in progress
            ? ` ${Math.round(progress.ratio * 100)}%`
            : "";
        text.textContent = `${messages.downloading}${ratio}`;
        barAction.hidden = true;
        return;
      }
      if (state === "working") {
        text.textContent =
          progress && "done" in progress
            ? `${messages.translating} ${progress.done}/${progress.total}`
            : messages.translating;
        barAction.hidden = true;
        return;
      }
      if (state === "failed") {
        text.textContent = messages.failed;
        barAction.textContent = messages.retry;
        barAction.hidden = false;
        return;
      }
      if (state === "translated") {
        text.textContent = messages.machineNote;
        barAction.textContent = messages.showOriginal;
        barAction.hidden = false;
      }
    },
    destroy() {
      stopTracking();
      entry.destroy();
      bar.remove();
      removeOffer();
    },
  };

  // 挂出来就是一致的：入口有文案、状态条收着。调用方不必记得补一次 setState
  widget.setState("idle");
  return widget;
}
