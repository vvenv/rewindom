import { describe, expect, it } from "vitest";

import {
  listMemberMenuLinks,
  memberMenuLinksForLocale,
  registerMemberMenuLink,
  renderMemberMenuLinksHtml,
  renderMemberMenuLinksJsonScript,
  resetMemberMenuLinks,
} from "./member-menu-links.js";

describe("member-menu-links", () => {
  it("按 order 排序，同 id 覆盖", () => {
    resetMemberMenuLinks();
    registerMemberMenuLink({
      id: "b",
      href: "/b",
      labels: { "zh-CN": "乙", en: "B" },
      order: 20,
    });
    registerMemberMenuLink({
      id: "a",
      href: "/a",
      labels: { "zh-CN": "甲", en: "A" },
      order: 10,
    });
    registerMemberMenuLink({
      id: "a",
      href: "/a2",
      labels: { "zh-CN": "甲二", en: "A2" },
      order: 10,
    });

    expect(listMemberMenuLinks().map((link) => link.href)).toEqual([
      "/a2",
      "/b",
    ]);
    expect(memberMenuLinksForLocale("en")).toEqual([
      { href: "/a2", label: "A2" },
      { href: "/b", label: "B" },
    ]);
  });

  it("HTML 与 JSON 埋点同清单", () => {
    resetMemberMenuLinks();
    registerMemberMenuLink({
      id: "billing",
      href: "/member/billing",
      labels: { "zh-CN": "我的订阅", en: "Billing" },
    });

    expect(renderMemberMenuLinksHtml("zh-CN")).toContain(
      'href="/member/billing"',
    );
    expect(renderMemberMenuLinksHtml("zh-CN")).toContain("我的订阅");
    expect(renderMemberMenuLinksJsonScript("en")).toContain(
      'id="member-menu-links"',
    );
    expect(renderMemberMenuLinksJsonScript("en")).toContain(
      '"label":"Billing"',
    );
  });
});
