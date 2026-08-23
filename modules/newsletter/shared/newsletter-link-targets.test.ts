import { describe, expect, it } from "vitest";

import { buildSubscribeLinkTargets } from "./newsletter-link-targets.js";

import type { SubscribeUsage } from "./newsletter-link-targets.js";

const OWN = "/subscribe";
const labels = {
  subscribe: "邮件订阅",
  jumpToSection: "跳过去并定位",
  samePage: "同页滚动",
};

function build(usages: SubscribeUsage[]) {
  return buildSubscribeLinkTargets({ usages, ownPath: OWN, labels });
}

const ownPage: SubscribeUsage = {
  page_path: OWN,
  page_kind: "newsletter_subscribe",
  page_title: "订阅更新",
  anchor: "subscribe",
  draft: false,
};
const homePage: SubscribeUsage = {
  page_path: "/",
  page_kind: "home",
  page_title: "首页",
  anchor: "subscribe",
  draft: false,
};

describe("订阅链接候选", () => {
  it("订阅页给裸路径，不再叠一条同义反复的锚点", () => {
    // 整页就是那张表单，`/subscribe#subscribe` 没有增加任何信息
    expect(build([ownPage]).map((x) => x.value)).toEqual([OWN]);
  });

  it("**不给**嵌了订阅段的普通页面裸路径", () => {
    /*
     * 这是这个文件存在的理由：链接到 `/` 语义上并不指向订阅——读者点了「订阅」
     * 落到的是首页顶部，订阅框还在下面某处。有意义的是锚点，不是页面地址本身。
     */
    const values = build([homePage]).map((x) => x.value);
    expect(values).not.toContain("/");
    expect(values).toEqual(["/#subscribe", "#subscribe"]);
  });

  it("没锚点的普通页面什么都不给", () => {
    // 没有能真正指向订阅的地址，给一条指向页面顶部的「邮件订阅」正是要避免的误导
    expect(build([{ ...homePage, anchor: null }])).toEqual([]);
  });

  it("同页锚点只出一条——每张页算出来都是同一个值", () => {
    const values = build([
      homePage,
      {
        ...homePage,
        page_path: "/about",
        page_kind: "page",
        page_title: "关于",
      },
    ]).map((x) => x.value);
    expect(values.filter((v) => v === "#subscribe")).toHaveLength(1);
    expect(values).toContain("/#subscribe");
    expect(values).toContain("/about#subscribe");
  });

  it("订阅页与普通页并存时，两种候选都在", () => {
    const values = build([ownPage, homePage]).map((x) => x.value);
    expect(values).toEqual([OWN, "/#subscribe", "#subscribe"]);
  });

  it("草稿标记透传下去", () => {
    expect(build([{ ...ownPage, draft: true }])[0]!.draft).toBe(true);
    // 已发布的不带这个键，免得下拉里人人都标着「草稿」
    expect(build([ownPage])[0]!.draft).toBeUndefined();
  });

  it("锚点候选带 hint，说清两者的区别", () => {
    const [jump, same] = build([homePage]);
    expect(jump!.hint).toBe(labels.jumpToSection);
    expect(same!.hint).toBe(labels.samePage);
  });

  it("空输入不炸", () => {
    expect(build([])).toEqual([]);
  });
});

describe("同页锚点的可见范围", () => {
  it("只在真的有订阅段的页面 kind 上可选", () => {
    /*
     * 不钉的话主题页上也会列出「同一页内滚动」——那张页没有订阅段，点了什么都不发生。
     */
    const anchor = build([homePage]).find((x) => x.value === "#subscribe");
    expect(anchor!.page_kinds).toEqual(["home"]);
  });

  it("多张页共用同一个锚点时，kind 取并集", () => {
    const anchor = build([
      homePage,
      { ...homePage, page_path: "/about", page_kind: "page" },
    ]).find((x) => x.value === "#subscribe");
    expect(new Set(anchor!.page_kinds)).toEqual(new Set(["home", "page"]));
  });

  it("跨页那条不钉 kind——从哪儿点都能跳过去", () => {
    const jump = build([homePage]).find((x) => x.value === "/#subscribe");
    expect(jump!.page_kinds).toBeUndefined();
  });
});
