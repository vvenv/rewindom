import { beforeEach, describe, expect, it } from "vitest";

import {
  applyTranslations,
  collectTextNodes,
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
    const originals = new Map<Text, string>();
    applyTranslations(snapshot, ["故障报告"], originals);
    expect(root.querySelector("p")?.textContent).toBe("\n      故障报告\n    ");
  });

  it("译文与原文相同的位置不记入 originals", () => {
    const root = mount(`<p>same</p>`);
    const snapshot = collectTextNodes(root);
    const originals = new Map<Text, string>();
    expect(applyTranslations(snapshot, ["same"], originals)).toBe(0);
    expect(originals.size).toBe(0);
  });
});

describe("restoreTranslations", () => {
  it("一次还原全部原文", () => {
    const root = mount(`<p>outage report</p><p>second line</p>`);
    const snapshot = collectTextNodes(root);
    const originals = new Map<Text, string>();
    applyTranslations(snapshot, ["故障报告", "第二行"], originals);
    expect(root.textContent).toBe("故障报告第二行");
    restoreTranslations(originals);
    expect(root.textContent).toBe("outage reportsecond line");
    expect(originals.size).toBe(0);
  });

  it("节点已脱离文档时跳过，不抛错", () => {
    const root = mount(`<p>gone soon</p>`);
    const snapshot = collectTextNodes(root);
    const originals = new Map<Text, string>();
    applyTranslations(snapshot, ["马上没了"], originals);
    root.innerHTML = "";
    expect(() => restoreTranslations(originals)).not.toThrow();
  });
});
