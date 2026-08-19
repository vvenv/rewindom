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
 * 就地写入译文并记住原文。
 *
 * 保留原文两端的空白：SSR 的 markup 里 `\n      ` 这类缩进也在文本节点上，
 * 直接整段替换会让行内元素之间的空格消失（`标题</a>作者` 粘成一坨）。
 */
export function applyTranslations(
  snapshot: DomSnapshot,
  translated: readonly string[],
  originals: Map<Text, string>,
): number {
  let changed = 0;
  snapshot.nodes.forEach((node, index) => {
    const next = translated[index];
    const current = snapshot.texts[index] as string;
    if (!next || next === current) return;
    if (!originals.has(node)) originals.set(node, current);
    const leading = /^\s*/.exec(current)?.[0] ?? "";
    const trailing = /\s*$/.exec(current)?.[0] ?? "";
    node.nodeValue = `${leading}${next.trim()}${trailing}`;
    changed += 1;
  });
  return changed;
}

/** 一次同步还原。节点已被移出文档时跳过（会员正文解锁会整段换掉 `main`）。 */
export function restoreTranslations(originals: Map<Text, string>): void {
  for (const [node, text] of originals) {
    if (node.isConnected) node.nodeValue = text;
  }
  originals.clear();
}
