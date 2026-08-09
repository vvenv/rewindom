import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { enhanceDocSearch } from "./doc-search.js";

/** 与 SSR 的 `renderDocListHtml` 同形：分组 + 每条带 `data-doc-search`，段内**无**搜索框。 */
const MARKUP = `
<div class="doc-list">
  <div class="doc-list-group">
    <h3 class="doc-list-group-title">入门</h3>
    <ul>
      <li data-doc-search="介绍 intro 从这里开始 入门"><a href="/docs/intro">介绍</a></li>
      <li data-doc-search="安装 install 五分钟装好 入门"><a href="/docs/install">安装</a></li>
    </ul>
  </div>
  <div class="doc-list-group">
    <h3 class="doc-list-group-title">参考</h3>
    <ul>
      <li data-doc-search="接口 api  参考"><a href="/docs/api">接口</a></li>
    </ul>
  </div>
</div>`;

function visibleSlugs(): string[] {
  return [...document.querySelectorAll<HTMLElement>("[data-doc-search]")]
    .filter((item) => !item.hidden)
    .map((item) => item.querySelector("a")!.getAttribute("href")!);
}

function go(query: string): void {
  window.history.replaceState(
    null,
    "",
    query ? `/docs?q=${encodeURIComponent(query)}` : "/docs",
  );
  document.body.innerHTML = MARKUP;
  enhanceDocSearch();
}

describe("enhanceDocSearch", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/docs");
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/");
  });

  it("没有 ?q= 时什么都不做", () => {
    enhanceDocSearch();
    expect(visibleSlugs()).toHaveLength(3);
    expect(document.querySelector(".doc-list-filter")).toBeNull();
  });

  it("按标题 / slug / 摘要 / 分类过滤", () => {
    go("install");
    expect(visibleSlugs()).toEqual(["/docs/install"]);

    // 摘要命中：搜索匹配摘要与「列表上显不显示摘要」是两件事
    go("五分钟");
    expect(visibleSlugs()).toEqual(["/docs/install"]);

    go("参考");
    expect(visibleSlugs()).toEqual(["/docs/api"]);
  });

  it("整组被过滤掉时连分类抬头一起收起", () => {
    go("接口");
    const groups = [
      ...document.querySelectorAll<HTMLElement>(".doc-list-group"),
    ];
    expect(groups.map((group) => group.hidden)).toEqual([true, false]);
  });

  // 段内已经没有搜索框了，这枚标签是「你看到的不是全部」的唯一可见状态
  it("在列表上方画出可清除的筛选标签", () => {
    go("接口");
    const chip = document.querySelector<HTMLElement>(".doc-list-filter")!;
    expect(chip).not.toBeNull();
    expect(chip.textContent).toContain("接口");
    // 必须在列表最前面，否则访客滚到底才发现自己在看筛选结果
    expect(document.querySelector(".doc-list")!.firstElementChild).toBe(chip);
  });

  it("点清除后恢复全部并去掉 ?q=", () => {
    go("接口");
    document
      .querySelector<HTMLButtonElement>(".doc-list-filter-clear")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(visibleSlugs()).toHaveLength(3);
    expect(document.querySelector(".doc-list-filter")).toBeNull();
    expect(new URL(window.location.href).searchParams.has("q")).toBe(false);
  });

  it("无结果时显示提示", () => {
    go("绝对搜不到");
    expect(visibleSlugs()).toEqual([]);
    const empty = document.querySelector<HTMLElement>(".doc-list-empty")!;
    expect(empty.textContent).toBe("没有匹配的文档");
  });

  it("页面上没有 doc-list 时不炸", () => {
    window.history.replaceState(null, "", "/about?q=x");
    document.body.innerHTML = "<main><h1>关于</h1></main>";
    expect(() => enhanceDocSearch()).not.toThrow();
  });
});
