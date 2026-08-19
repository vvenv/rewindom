import { beforeEach, describe, expect, it } from "vitest";

import {
  applyTranslations,
  collectTextNodes,
  createMemory,
  restoreTranslations,
} from "./translate-dom.js";

function mount(html: string): HTMLElement {
  document.body.innerHTML = `<main class="site-main">${html}</main>`;
  return document.querySelector("main") as HTMLElement;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("collectTextNodes", () => {
  it("收正文，跳过 code / pre", () => {
    const root = mount(`<p>outage report</p><pre>rm -rf /</pre><code>npm i</code>`);
    expect(collectTextNodes(root).texts).toEqual(["outage report"]);
  });

  it("跳过 translate=no 与 data-no-translate", () => {
    const root = mount(
      `<p>keep this</p><p translate="no">brand name</p><p data-no-translate>sku-1</p>`,
    );
    expect(collectTextNodes(root).texts).toEqual(["keep this"]);
  });

  it("跳过页头页脚 —— 那是代码 i18n 的地盘", () => {
    document.body.innerHTML = `<header><a>登录</a></header><main><p>body text</p></main><footer><span>版权</span></footer>`;
    expect(collectTextNodes(document.body).texts).toEqual(["body text"]);
  });

  it("纯空白节点不算", () => {
    const root = mount(`<p>\n  </p><p>real</p>`);
    expect(collectTextNodes(root).texts).toEqual(["real"]);
  });
});

describe("applyTranslations", () => {
  it("写入译文并保留两端空白", () => {
    const root = mount(`<p>\n      outage report\n    </p>`);
    const snapshot = collectTextNodes(root);
    const memory = createMemory();
    applyTranslations(snapshot, ["故障报告"], memory, { target: "zh-CN" });
    expect(root.querySelector("p")?.textContent).toBe("\n      故障报告\n    ");
  });

  it("译文与原文相同的位置不记入 memory", () => {
    const root = mount(`<p>same</p>`);
    const snapshot = collectTextNodes(root);
    const memory = createMemory();
    expect(applyTranslations(snapshot, ["same"], memory, { target: "zh-CN" })).toBe(0);
    expect(memory.texts.size).toBe(0);
    expect(memory.langs.size).toBe(0);
  });

  /*
   * `lang` 决定读屏器的发音与断词。把英文正文换成中文却留着 `lang="en"`，
   * 读屏器会用英文音去念中文——改了字就必须改这个属性。
   */
  it("整块都译了才把 lang 标成目标语言", () => {
    const root = mount(`<p lang="en">outage report</p>`);
    const snapshot = collectTextNodes(root);
    const memory = createMemory();
    applyTranslations(snapshot, ["故障报告"], memory, { target: "zh-CN" });
    expect(root.querySelector("p")?.getAttribute("lang")).toBe("zh-CN");
    expect(memory.langs.get(root.querySelector("p") as Element)).toBe("en");
  });

  it("父元素里还有没被翻的文本时不标 lang —— 半块标上等于给另一半配错发音", () => {
    const root = mount(`<p>outage report<span translate="no">Cloudflare</span>后续</p>`);
    const snapshot = collectTextNodes(root);
    const memory = createMemory();
    // 只送第一段去翻，`后续` 那个文本节点留在原文
    applyTranslations(
      { nodes: [snapshot.nodes[0] as Text], texts: [snapshot.texts[0] as string] },
      ["故障报告"],
      memory,
      { target: "zh-CN" },
    );
    expect(root.querySelector("p")?.hasAttribute("lang")).toBe(false);
  });

  it("同一元素的文本节点被切进两批时，最后一批落地才标 lang", () => {
    const root = mount(`<p>outage report<em translate="no">x</em>second line</p>`);
    const snapshot = collectTextNodes(root);
    const memory = createMemory();
    const target = { target: "zh-CN" };
    const paragraph = root.querySelector("p") as Element;
    applyTranslations(
      { nodes: [snapshot.nodes[0] as Text], texts: [snapshot.texts[0] as string] },
      ["故障报告"],
      memory,
      target,
    );
    expect(paragraph.hasAttribute("lang")).toBe(false);
    applyTranslations(
      { nodes: [snapshot.nodes[1] as Text], texts: [snapshot.texts[1] as string] },
      ["第二行"],
      memory,
      target,
    );
    expect(paragraph.getAttribute("lang")).toBe("zh-CN");
  });
});

describe("restoreTranslations", () => {
  it("一次还原全部原文", () => {
    const root = mount(`<p>outage report</p><p>second line</p>`);
    const snapshot = collectTextNodes(root);
    const memory = createMemory();
    applyTranslations(snapshot, ["故障报告", "第二行"], memory, { target: "zh-CN" });
    expect(root.textContent).toBe("故障报告第二行");
    restoreTranslations(memory);
    expect(root.textContent).toBe("outage reportsecond line");
    expect(memory.texts.size).toBe(0);
  });

  it("lang 还原成原样，本来没有的就移除 —— 不该由「显示原文」改掉页面自带的 markup", () => {
    const root = mount(`<p lang="en">outage report</p><p>second line</p>`);
    const snapshot = collectTextNodes(root);
    const memory = createMemory();
    applyTranslations(snapshot, ["故障报告", "第二行"], memory, { target: "zh-CN" });
    restoreTranslations(memory);
    const [first, second] = [...root.querySelectorAll("p")];
    expect(first?.getAttribute("lang")).toBe("en");
    expect(second?.hasAttribute("lang")).toBe(false);
    expect(memory.langs.size).toBe(0);
  });

  it("节点已脱离文档时跳过，不抛错", () => {
    const root = mount(`<p>gone soon</p>`);
    const snapshot = collectTextNodes(root);
    const memory = createMemory();
    applyTranslations(snapshot, ["马上没了"], memory, { target: "zh-CN" });
    root.innerHTML = "";
    expect(() => restoreTranslations(memory)).not.toThrow();
  });
});
