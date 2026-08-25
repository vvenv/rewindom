import { describe, expect, it } from "vitest";

import { linkTargetVisibleOnPage, type SiteLinkTarget  } from "./site-link-target.js";


const base = { value: "/x", label: "X", group: "page" } as const;
const global: SiteLinkTarget = { ...base };
const topicOnly: SiteLinkTarget = {
  ...base,
  page_kinds: ["events_topic", "events_detail"],
};
const entityOnly: SiteLinkTarget = { ...base, page_kinds: ["events_entity"] };

describe("linkTargetVisibleOnPage", () => {
  it("没声明 page_kinds 的候选处处可选", () => {
    for (const kind of ["home", "events_topic", undefined]) {
      expect(linkTargetVisibleOnPage(global, kind)).toBe(true);
    }
  });

  it("主题页看得到主题候选，看不到实体候选", () => {
    /*
     * 这是这个函数存在的理由：`/subscribe?list={entity_list}` 摆在主题页上，
     * 那个参数会被 collapseQuery 收掉，读者点过去订的是全站——
     * 不是租户以为的那件事。
     */
    expect(linkTargetVisibleOnPage(topicOnly, "events_topic")).toBe(true);
    expect(linkTargetVisibleOnPage(entityOnly, "events_topic")).toBe(false);
  });

  it("实体页反过来", () => {
    expect(linkTargetVisibleOnPage(entityOnly, "events_entity")).toBe(true);
    expect(linkTargetVisibleOnPage(topicOnly, "events_entity")).toBe(false);
  });

  it("事件详情页也算主题候选的地盘——它有所属主题", () => {
    expect(linkTargetVisibleOnPage(topicOnly, "events_detail")).toBe(true);
  });

  it("首页看不到任何页面级候选", () => {
    expect(linkTargetVisibleOnPage(topicOnly, "home")).toBe(false);
    expect(linkTargetVisibleOnPage(entityOnly, "home")).toBe(false);
  });

  it("页面 kind 未知时（页头页脚这类站点级位置）一律不列", () => {
    // 那里根本没有页面上下文，token 解不出东西
    expect(linkTargetVisibleOnPage(topicOnly, undefined)).toBe(false);
  });
});
