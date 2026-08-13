/**
 * 跨模块 chrome 块贡献契约。
 *
 * 购物车入口这类要紧凑地排在页头里，不能再当一段公告条。贡献块出现在
 * header / footer 的「添加区块」菜单，SSR 与编辑器都能画出来。
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  addableBlockDefinitions,
  createBlock,
  createSection,
  getBlockDefinition,
  registerChromeBlock,
  resetChromeBlockContributions,
  type BlockDefinition,
} from "./section-schema.js";
import {
  registerChromeBlockHtml,
  resetChromeBlockHtml,
} from "./sections/_common/chrome-html.js";
import { renderHeaderHtml } from "./sections/header/html.js";
import {
  loadMarketingSiteCssFor,
  resetSectionCss,
} from "./load-marketing-site-css.js";

const TYPE = "demo.cart-btn";

const demoBlock: BlockDefinition = {
  type: TYPE,
  label: "demo:block.cart",
  singleton: true,
  entitlement: "tenant-demo",
  settings: [],
};

function contribute(): void {
  registerChromeBlockHtml(demoBlock, () => `<a class="demo-cart" href="/cart">Cart</a>`, {
    css: ".demo-cart{color:red}",
  });
}

afterEach(() => {
  resetChromeBlockContributions();
  resetChromeBlockHtml();
  resetSectionCss();
});

describe("贡献 chrome 块", () => {
  it("登记后页头能查到、能加进菜单", () => {
    contribute();
    expect(getBlockDefinition("header", TYPE)?.type).toBe(TYPE);
    expect(getBlockDefinition("footer", TYPE)?.type).toBe(TYPE);
    const header = createSection("header");
    expect(addableBlockDefinitions(header, new Set(["tenant-demo"])).map((d) => d.type)).toContain(
      TYPE,
    );
  });

  it("未开通 entitlement 不进菜单，开通了才进", () => {
    contribute();
    const header = createSection("header");
    expect(addableBlockDefinitions(header, new Set()).map((d) => d.type)).not.toContain(TYPE);
    expect(
      addableBlockDefinitions(header, new Set(["tenant-demo"])).map((d) => d.type),
    ).toContain(TYPE);
  });

  it("单例加过一次就从菜单消失", () => {
    contribute();
    const header = createSection("header");
    header.blocks.push(createBlock("header", TYPE));
    expect(
      addableBlockDefinitions(header, new Set(["tenant-demo"])).map((d) => d.type),
    ).not.toContain(TYPE);
  });

  it("type 不带模块前缀直接抛", () => {
    expect(() => registerChromeBlock({ ...demoBlock, type: "cart" })).toThrow(
      /chrome_block_type_invalid/u,
    );
  });

  it("撞了内置 chrome 块直接抛", () => {
    expect(() =>
      registerChromeBlock({ ...demoBlock, type: "chrome_locale" }),
    ).toThrow(/chrome_block_type_conflict/u);
  });

  it("SSR 把贡献块画进页头；未开通则不输出", () => {
    contribute();
    const section = createSection("header");
    section.blocks.push(createBlock("header", TYPE, { align: "end" }));
    const html = renderHeaderHtml({
      section,
      siteName: "站点",
      logoUrl: null,
      homeHref: "/",
      enabledEntitlements: new Set(["tenant-demo"]),
    });
    expect(html).toContain("demo-cart");
    expect(html).toContain("/cart");

    const gated = renderHeaderHtml({
      section,
      siteName: "站点",
      logoUrl: null,
      homeHref: "/",
      enabledEntitlements: new Set(),
    });
    expect(gated).not.toContain("demo-cart");
  });

  it("贡献块 CSS 按 type 按需发出", () => {
    contribute();
    expect(loadMarketingSiteCssFor(new Set([TYPE]))).toContain(".demo-cart");
    expect(loadMarketingSiteCssFor(new Set(["hero"]))).not.toContain(".demo-cart");
  });
});
