/**
 * 在已渲染的 DOM 上就地替换文本节点，并保留还原能力。
 *
 * 公开站是 SSR 出来的静态 HTML，没有 React 可以重渲染，所以只能扫文本节点。
 * 关键约束：
 * - **只动文本节点**，不碰标签与属性，链接、样式、事件绑定全不受影响
 * - 原文存在内存里（不是 `data-` 属性），还原是一次同步遍历，不必再请求
 * - 跳过 `code` / `pre` / `[translate="no"]` —— 代码片段被翻译等于毁掉
 * - 跳过页头页脚：那是**代码 i18n**（`client/locales/*.json`）已经译好的界面
 *   文案，再翻一遍只会把「登录」翻成别的说法
 */

/** 整棵子树都不进翻译的元素。 */
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
  "VAR",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "SVG",
  "TIME",
]);

/** 站点外壳：由代码 i18n 负责，不重复翻译。 */
const SKIP_SELECTOR = [
  "[translate='no']",
  "[data-no-translate]",
  ".site-header",
  ".site-footer",
  "header",
  "footer",
  "nav",
].join(",");

export interface DomSnapshot {
  nodes: Text[];
  texts: string[];
}

function shouldSkip(element: Element): boolean {
  if (SKIP_TAGS.has(element.tagName)) return true;
  if (element.closest(SKIP_SELECTOR)) return true;
  // 作者显式声明这一段是另一种语言时，交给浏览器自己处理
  return element.getAttribute("translate") === "no";
}

/**
 * 收集 `root` 下值得翻译的文本节点。
 *
 * 合并相邻节点是**故意不做**的：一个 `<h3>` 里的文本和它旁边 `<span>` 的时间戳
 * 拼成一句送去翻译，回来就没法按原结构塞回去了。宁可多几次调用。
 */
export function collectTextNodes(root: ParentNode): DomSnapshot {
  const nodes: Text[] = [];
  const texts: string[] = [];
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node): number {
      const text = node.nodeValue ?? "";
      if (text.trim().length === 0) return NodeFilter.FILTER_REJECT;
      const parent = (node as Text).parentElement;
      if (!parent || shouldSkip(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    texts.push(current.nodeValue ?? "");
    current = walker.nextNode();
  }
  return { nodes, texts };
}

/**
 * 一次翻译的全部可还原状态。
 *
 * 不止文本：改写了正文语言就必须同步改 `lang`，所以原属性也得记一份。两张表
 * 一起给一起清，避免出现「文本还原了、`lang` 还停在译文语言」这种半截状态。
 */
export interface TranslationMemory {
  /** 文本节点 → 原文。 */
  texts: Map<Text, string>;
  /** 元素 → 原 `lang` 属性；`null` = 本来就没有这个属性。 */
  langs: Map<Element, string | null>;
}

export function createMemory(): TranslationMemory {
  return { texts: new Map(), langs: new Map() };
}

/**
 * 这个元素**直接**挂着的非空文本是不是全被翻了？
 *
 * `lang` 是继承的，所以只能在「整块都换了语言」时才敢往上标。一个 `<p>` 里
 * 英文正文旁边还挂着一段没被翻的中文时标上 `lang="zh-CN"`（或反过来），读屏器
 * 会用错的音去念那一半——比不标更糟。
 */
function fullyTranslated(element: Element, memory: TranslationMemory): boolean {
  let any = false;
  for (const child of element.childNodes) {
    if (child.nodeType !== Node.TEXT_NODE) continue;
    const text = child as Text;
    if ((text.nodeValue ?? "").trim().length === 0) continue;
    any = true;
    if (!memory.texts.has(text)) return false;
  }
  return any;
}

/**
 * 就地写入译文并记住原文。
 *
 * 保留原文两端的空白：SSR 的 markup 里 `\n      ` 这类缩进也在文本节点上，
 * 直接整段替换会让行内元素之间的空格消失（`标题</a>作者` 粘成一坨）。
 *
 * 写完文本还要把父元素的 `lang` 改成目标语言：SSR 出的是 `<html lang="zh-CN">`，
 * 正文换成中文后 `lang` 恰好对得上，但反过来（英文站翻成英文）以及任何
 * `lang="en"` 的子树都会说谎。`lang` 决定读屏器的发音、断词与浏览器自带翻译的
 * 判断，改了字不改它等于留下一份不一致的可访问性信息。
 *
 * 跨批次也成立：`memory` 是累积的，一个元素的文本节点被切进两批时，最后一批
 * 落地时 `fullyTranslated` 才第一次为真，`lang` 就在那时标上。
 */
export function applyTranslations(
  snapshot: DomSnapshot,
  translated: readonly string[],
  memory: TranslationMemory,
  options: { target: string },
): number {
  let changed = 0;
  const touched = new Set<Element>();
  snapshot.nodes.forEach((node, index) => {
    const next = translated[index];
    const current = snapshot.texts[index] as string;
    if (!next || next === current) return;
    if (!memory.texts.has(node)) memory.texts.set(node, current);
    const leading = /^\s*/.exec(current)?.[0] ?? "";
    const trailing = /\s*$/.exec(current)?.[0] ?? "";
    node.nodeValue = `${leading}${next.trim()}${trailing}`;
    if (node.parentElement) touched.add(node.parentElement);
    changed += 1;
  });

  for (const element of touched) {
    if (memory.langs.has(element)) continue;
    if (!fullyTranslated(element, memory)) continue;
    memory.langs.set(element, element.getAttribute("lang"));
    element.setAttribute("lang", options.target);
  }
  return changed;
}

/** 一次同步还原。节点已被移出文档时跳过（会员正文解锁会整段换掉 `main`）。 */
export function restoreTranslations(memory: TranslationMemory): void {
  for (const [node, text] of memory.texts) {
    if (node.isConnected) node.nodeValue = text;
  }
  /*
   * `lang` 还原成**原样**，包括「原本就没有」——那时移除属性而不是补一个源语言。
   * 英文正文挂在 `lang="zh-CN"` 下面确实是错的，但那是 SSR 该出的标注，
   * 不该由一次「显示原文」偷偷改掉页面自带的 markup。
   */
  for (const [element, lang] of memory.langs) {
    if (!element.isConnected) continue;
    if (lang === null) element.removeAttribute("lang");
    else element.setAttribute("lang", lang);
  }
  memory.texts.clear();
  memory.langs.clear();
}
