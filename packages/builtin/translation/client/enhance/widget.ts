/**
 * 公开站的翻译控件（无 React，无外部 CSS）。
 *
 * **优先挂进页头**的控件区（`.chrome-zone-end .chrome-pins`），与语言切换、
 * 明暗切换并排——翻译本来就是「语言」这一类操作，放在读者已经会去找语言开关
 * 的地方，比右下角浮标顺手也显眼得多。页头不存在时（裸段落页、会员闸门页）
 * 才回落成浮标，保证任何页面都有入口。
 *
 * 样式由脚本注入而不是走 marketing 的段 CSS 管线：控件不是一个「段」，段样式
 * 只在页面用到该段时才下发；而且只有翻译开着时才需要这几行 CSS。
 */

import { widgetMessages } from "../../shared/messages.js";

import type { AppLocale } from "@rewindom/shared";

const STYLE_ID = "rw-translate-style";

/** 页头控件区。marketing 的 chrome 结构，找不到就回落浮标。 */
const HEADER_SLOT = ".site-header .chrome-zone-end .chrome-pins";

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`;

const CSS = `
.rw-translate {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
  font: inherit;
  font-size: .8125rem;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}
.rw-translate:disabled { cursor: progress; opacity: .7; }
.rw-translate-label { font-weight: 500; }
/* 页头模式：借用站点自己的 chrome-control 外观，只补一点内边距放下文字 */
.rw-translate-in-header { padding-inline: .5rem; width: auto; }
/* 浮标模式：页头不存在时的回落 */
.rw-translate-floating {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 60;
  padding: .5rem .75rem;
  border-radius: 999px;
  border: 1px solid var(--site-border, rgba(0,0,0,.12));
  background: var(--site-surface, #fff);
  color: var(--site-fg, #111);
  box-shadow: 0 2px 12px rgba(0,0,0,.12);
}
/*
 * 机器翻译声明**不放进页头**：页头控件区是紧排的图标行，塞一句话进去会和相邻
 * 图标叠在一起。挂在正文顶部反而更该如此——它说明的是下面这片正文的性质，
 * 而不是那颗按钮的。
 */
.rw-translate-note {
  display: block;
  padding: .5rem 1rem;
  font-size: .75rem;
  text-align: center;
  color: var(--site-muted, #666);
  background: var(--site-subtle, rgba(127,127,127,.08));
  border-bottom: 1px solid var(--site-border, rgba(127,127,127,.18));
}
.rw-translate-note[hidden] { display: none; }
.rw-translate-floating-note {
  position: fixed;
  right: 1rem;
  bottom: 3.5rem;
  z-index: 60;
  max-width: 16rem;
  padding: .375rem .625rem;
  border-radius: .5rem;
  background: var(--site-surface, #fff);
  border: 1px solid var(--site-border, rgba(0,0,0,.12));
  white-space: normal;
}
@media (max-width: 640px) {
  .rw-translate-floating { right: .75rem; bottom: .75rem; }
  .rw-translate-floating-note { right: .75rem; bottom: 3.25rem; }
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

export interface TranslateWidget {
  setState(
    state: WidgetState,
    progress?: { done: number; total: number } | { ratio: number },
  ): void;
  destroy(): void;
}

/**
 * 挂进页头控件区；结构照抄相邻的 `.chrome-block > .chrome-control`，
 * 这样站点主题改了 chrome 样式，翻译按钮跟着一起变。
 */
function mountInHeader(button: HTMLButtonElement, note: HTMLElement): boolean {
  const pins = document.querySelector(HEADER_SLOT);
  if (!pins) return false;
  const block = document.createElement("div");
  block.className = "chrome-block";
  button.classList.add("chrome-control", "rw-translate-in-header");
  block.append(button);
  // 放在最前面 = 紧挨着语言切换器，读者找语言相关操作时第一眼就看到
  pins.prepend(block);
  // 声明贴在正文顶部，说明的是正文而不是按钮
  const main = document.querySelector("main.site-main");
  if (main) main.prepend(note);
  else document.body.prepend(note);
  return true;
}

function mountFloating(button: HTMLButtonElement, note: HTMLElement): void {
  button.classList.add("rw-translate-floating");
  note.classList.add("rw-translate-floating-note");
  document.body.append(note, button);
}

export function mountTranslateWidget(
  locale: AppLocale,
  onToggle: () => void,
): TranslateWidget {
  injectStyle();
  const messages = widgetMessages(locale);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "rw-translate";
  /*
   * 控件自身**不能被翻译**：它在 `.site-header` 里（扫描根之外）已经躲开了本模块，
   * 再加 translate=no 是防浏览器自带的整页翻译把按钮文案也换掉——那会让
   * 「显示原文」变成一句译文，读者点了才发现按钮说的不是自己以为的意思。
   */
  button.setAttribute("translate", "no");

  const label = document.createElement("span");
  label.className = "rw-translate-label";
  label.textContent = messages.translate;
  button.innerHTML = ICON;
  button.appendChild(label);

  const note = document.createElement("span");
  note.className = "rw-translate-note";
  note.setAttribute("translate", "no");
  note.textContent = messages.machineNote;
  note.hidden = true;

  button.addEventListener("click", onToggle);
  if (!mountInHeader(button, note)) mountFloating(button, note);

  return {
    setState(state, progress) {
      button.disabled = state === "working" || state === "downloading";
      note.hidden = state !== "translated";
      if (state === "downloading") {
        const ratio =
          progress && "ratio" in progress
            ? ` ${Math.round(progress.ratio * 100)}%`
            : "";
        label.textContent = `${messages.downloading}${ratio}`;
        return;
      }
      if (state === "working") {
        label.textContent =
          progress && "done" in progress
            ? `${messages.translating} ${progress.done}/${progress.total}`
            : messages.translating;
        return;
      }
      if (state === "failed") {
        label.textContent = messages.failed;
        button.setAttribute("aria-pressed", "false");
        return;
      }
      label.textContent =
        state === "translated" ? messages.showOriginal : messages.translate;
      button.setAttribute("aria-pressed", String(state === "translated"));
    },
    destroy() {
      button.closest(".chrome-block")?.remove();
      button.remove();
      note.remove();
    },
  };
}
