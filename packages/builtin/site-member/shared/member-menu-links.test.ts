import { describe, expect, it } from "vitest";

import { MEMBER_ACCOUNT_PATH } from "./member-account-section.js";
import {
  listMemberMenuLinks,
  listMemberSiblingLinks,
  memberMenuLinksForLocale,
  registerMemberMenuLink,
  renderMemberMenuLinksHtml,
  renderMemberMenuLinksJsonScript,
  renderMemberSiblingLinksHtml,
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

  it("自助页互链含账户，并剔掉当前页", () => {
    resetMemberMenuLinks();
    registerMemberMenuLink({
      id: "billing",
      href: "/member/billing",
      labels: { "zh-CN": "我的订阅", en: "Billing" },
      order: 10,
    });

    expect(
      listMemberSiblingLinks({ excludeHref: MEMBER_ACCOUNT_PATH }).map(
        (link) => link.href,
      ),
    ).toEqual(["/member/billing"]);
    expect(
      listMemberSiblingLinks({ excludeHref: "/member/billing" }).map(
        (link) => link.href,
      ),
    ).toEqual([MEMBER_ACCOUNT_PATH]);

    const billingPageNav = renderMemberSiblingLinksHtml("zh-CN", {
      excludeHref: "/member/billing",
    });
    expect(billingPageNav).toContain('href="/member/account"');
    expect(billingPageNav).toContain("我的账户");
    expect(billingPageNav).not.toContain("/member/billing");
  });
});
