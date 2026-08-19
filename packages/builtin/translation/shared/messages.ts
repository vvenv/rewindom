/**
 * 翻译控件的固定文案（跟随**站点语言**，不走工作台 i18n）。
 *
 * 与 marketing 的 `chrome-messages.ts` 同一条路子：公开站的 enhance 层没有
 * i18next，控件文案必须在这里按 locale 取。
 */

import type { AppLocale } from "@rewindom/shared";

interface WidgetMessages {
  translate: string;
  translating: string;
  showOriginal: string;
  machineNote: string;
  unavailable: string;
}

const MESSAGES: Record<AppLocale, WidgetMessages> = {
  "zh-CN": {
    translate: "翻译此页",
    translating: "翻译中…",
    showOriginal: "显示原文",
    /** 必须显式标注机器翻译——读者要知道自己看的不是原始表述。 */
    machineNote: "机器翻译，以原文为准",
    unavailable: "此浏览器不支持翻译",
  },
  en: {
    translate: "Translate",
    translating: "Translating…",
    showOriginal: "Show original",
    machineNote: "Machine translated — the original is authoritative",
    unavailable: "Translation unavailable in this browser",
  },
};

export function widgetMessages(locale: AppLocale): WidgetMessages {
  return MESSAGES[locale] ?? MESSAGES["zh-CN"];
}

/**
 * 正文看起来已经是目标语言了吗？
 *
 * 用来决定**要不要显示翻译入口**。中文站上一篇中文报道旁边挂个「翻译此页」，
 * 点下去什么都不变，比没有这个按钮更让人困惑。
 *
 * 纯字符统计，不依赖任何 API——`LanguageDetector` 只有 Chrome 有，而这个判断
 * 在所有浏览器上都要做。
 */
export function looksLikeTargetLanguage(sample: string, target: string): boolean {
  const text = sample.slice(0, 2000);
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  if (letters < 20) return true; // 样本太少，宁可不显示按钮
  const cjk = text.match(/[一-鿿぀-ヿ]/gu)?.length ?? 0;
  const ratio = cjk / letters;
  if (target.startsWith("zh") || target.startsWith("ja")) return ratio > 0.3;
  // 目标是拉丁语系：正文里几乎没有 CJK 就算已经是目标语言
  return ratio < 0.05;
}
