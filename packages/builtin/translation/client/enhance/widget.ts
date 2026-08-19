/**
 * 公开站的翻译控件（无 React，无外部 CSS）。
 *
 * 样式由脚本注入而不是走 marketing 的段 CSS 管线：控件不是一个「段」，
 * 段样式只在页面用到该段时才下发；而且只有翻译开着时才需要这几行 CSS，
 * 注入正好只在那时发生。
 */

import { widgetMessages } from "../../shared/messages.js";

import type { AppLocale } from "@rewindom/shared";

const STYLE_ID = "rw-translate-style";

const CSS = `
.rw-translate {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .5rem .75rem;
  border-radius: 999px;
  border: 1px solid var(--site-border, rgba(0,0,0,.12));
  background: var(--site-surface, #fff);
  color: var(--site-fg, #111);
  font: inherit;
  font-size: .8125rem;
  line-height: 1.2;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0,0,0,.12);
}
.rw-translate:disabled { cursor: progress; opacity: .75; }
.rw-translate[hidden] { display: none; }
.rw-translate-note {
  position: fixed;
  right: 1rem;
  bottom: 3.5rem;
  z-index: 60;
  max-width: 16rem;
  padding: .375rem .625rem;
  border-radius: .5rem;
  background: var(--site-surface, #fff);
  border: 1px solid var(--site-border, rgba(0,0,0,.12));
  color: var(--site-muted, #666);
  font-size: .75rem;
  line-height: 1.4;
}
.rw-translate-note[hidden] { display: none; }
@media (max-width: 640px) {
  .rw-translate { right: .75rem; bottom: .75rem; }
  .rw-translate-note { right: .75rem; bottom: 3.25rem; }
}
`;

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export type WidgetState = "idle" | "working" | "translated";

export interface TranslateWidget {
  setState(state: WidgetState, progress?: { done: number; total: number }): void;
  destroy(): void;
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
   * 控件本身**不能被自己翻译**：它在 `main` 外面（body 直挂）已经躲开了扫描根，
   * 再加 translate=no 是防浏览器自带的整页翻译把按钮文案也换掉——那会让
   * 「显示原文」变成一句译文，读者点了才发现按钮说的不是自己以为的意思。
   */
  button.setAttribute("translate", "no");
  button.textContent = messages.translate;

  const note = document.createElement("p");
  note.className = "rw-translate-note";
  note.setAttribute("translate", "no");
  note.textContent = messages.machineNote;
  note.hidden = true;

  button.addEventListener("click", onToggle);
  document.body.appendChild(note);
  document.body.appendChild(button);

  return {
    setState(state, progress) {
      button.disabled = state === "working";
      note.hidden = state !== "translated";
      if (state === "working") {
        button.textContent = progress
          ? `${messages.translating} ${progress.done}/${progress.total}`
          : messages.translating;
        return;
      }
      button.textContent =
        state === "translated" ? messages.showOriginal : messages.translate;
      button.setAttribute("aria-pressed", String(state === "translated"));
    },
    destroy() {
      button.remove();
      note.remove();
    },
  };
}
