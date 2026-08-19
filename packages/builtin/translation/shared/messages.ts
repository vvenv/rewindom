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
  /** 首次翻译要下模型，几十 MB，没有这一条按钮看起来就是卡死了。 */
  downloading: string;
  showOriginal: string;
  machineNote: string;
  unavailable: string;
  /** 一个字都没译出来时显示。**不能**沿用「显示原文」——那等于骗读者说翻过了。 */
  failed: string;
}

const MESSAGES: Record<AppLocale, WidgetMessages> = {
  "zh-CN": {
    translate: "翻译此页",
    translating: "翻译中…",
    downloading: "正在准备翻译模型…",
    showOriginal: "显示原文",
    /** 必须显式标注机器翻译——读者要知道自己看的不是原始表述。 */
    machineNote: "机器翻译，以原文为准",
    unavailable: "此浏览器不支持翻译",
    failed: "翻译未成功，重试",
  },
  en: {
    translate: "Translate",
    translating: "Translating…",
    downloading: "Preparing translation model…",
    showOriginal: "Show original",
    machineNote: "Machine translated — the original is authoritative",
    unavailable: "Translation unavailable in this browser",
    failed: "Translation failed — retry",
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
  return isAlreadyInTargetLanguage(text, target);
}

/**
 * **单个文本节点**是否已经是目标语言——是就不送去翻译。
 *
 * 这是「只翻内容、不翻界面」的实现方式。公开页上混着两类文本：站点文案与段
 * 标题（CMS 里写好的、或代码 i18n 出来的，**本来就是站点语言**）和事件正文
 * （来源原文，多为英文）。按节点判断能自动分开这两者，不需要每个贡献方模块
 * 都去标记自己的 markup——标记法漏一处就是一处永远翻不到的内容。
 *
 * 与 `looksLikeTargetLanguage` 的差别是**没有长度下限**：页面级判断样本少时
 * 宁可不显示入口，节点级则相反——`Berd` 这种四个字母的标题也得翻。
 */
export function isAlreadyInTargetLanguage(
  text: string,
  target: string,
): boolean {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return true; // 纯数字 / 符号，没什么可翻的
  const cjk = text.match(/[一-鿿぀-ヿ]/gu)?.length ?? 0;
  const ratio = cjk / letters;
  if (target.startsWith("zh") || target.startsWith("ja")) return ratio > 0.3;
  // 目标是拉丁语系：几乎没有 CJK 就算已经是目标语言
  return ratio < 0.05;
}

/**
 * 没有 `LanguageDetector` 时的源语言兜底猜测。
 *
 * `Translator.create()` **必须**给出源语言，而 `LanguageDetector` 是独立的一个
 * API——只有 Translator 没有 Detector 的浏览器上，不兜这一手的表现是「点了按钮
 * 什么都不发生」，是最难查的一种坏。
 *
 * 只在中文与英文之间二选一：这是 `APP_LOCALES` 的全部，猜错的代价也只是这一次
 * 不译（引擎发现源与目标同语言会原样返回）。
 */
export function guessSourceLanguage(sample: string): string {
  const text = sample.slice(0, 2000);
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return "en";
  const cjk = text.match(/[一-鿿぀-ヿ]/gu)?.length ?? 0;
  return cjk / letters > 0.15 ? "zh-CN" : "en";
}
