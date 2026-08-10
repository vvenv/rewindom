/**
 * 账户面板两端渲染的**结构对齐**守卫，同 `MemberAuthFormSection.test.tsx`。
 *
 * 这一页在编辑器里改的就是版式：少画一张表单、把「退出登录」漏在预览外面，站长看到的
 * 和会员看到的就是两张不同的页面。而贡献段不在 marketing 那条通用守卫的名单里。
 */

import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  createSection,
  type SiteSection,
} from "../../../marketing/shared/section-schema.js";
import { SECTION_HTML } from "../../../marketing/shared/sections/html.js";
import { registerMemberAccountSection } from "../../server/member-account-section.js";
import {
  MEMBER_ACCOUNT_PANEL_SECTION_TYPE,
  memberAccountContextEntry,
  type MemberAccountRenderContext,
} from "../../shared/member-account-section.js";

import { MemberAccountPanelSection } from "./MemberAccountPanelSection.js";

import type { SectionRenderContext } from "../../../marketing/shared/sections/render-context.js";

/** 预览里的样例数据来自 i18n；测试里回显 key 就够，形状对齐才是这里要看的。 */
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

/** 与预览里的样例数据同形（`editor.accountSample.*`），两端的形状才比得起来。 */
const ACCOUNT: MemberAccountRenderContext = {
  action: "/member/account",
  email: "editor.accountSample.email",
  display_name: "editor.accountSample.displayName",
  created_at: "editor.accountSample.date",
  last_login_at: "editor.accountSample.date",
  error: null,
  notice: null,
  intent: null,
};

/**
 * 整棵树的「标签 + class」，逐层缩进。
 *
 * 只到卡的直接子节点是不够的：那样「预览漏画了保存按钮」「密码块少了一栏」都照样
 * 过——而这恰恰是两端最容易走散的地方。属性不比（预览的 `readOnly` / `tabIndex`、
 * SSR 的 `open` / `type="submit"` 都是刻意的差别）。
 */
function shapeOf(nodes: Iterable<Element>, depth = 0): string[] {
  return [...nodes].flatMap((el) => {
    // SSR 的 intent 隐藏字段是 POST 的分流开关；预览不提交，没有它才对
    if (el instanceof HTMLInputElement && el.type === "hidden") return [];
    return [
      `${"  ".repeat(depth)}${el.tagName.toLowerCase()}.${el.className || "-"}`,
      ...shapeOf(el.children, depth + 1),
    ];
  });
}

function fixture(settings: Record<string, unknown> = {}): SiteSection {
  const section = createSection(MEMBER_ACCOUNT_PANEL_SECTION_TYPE);
  section.settings = {
    ...section.settings,
    heading: "我的账户",
    subheading: "管理你的资料",
    ...settings,
  } as never;
  return section;
}

function ssrShape(section: SiteSection): string[] {
  const ctx: SectionRenderContext = {
    contributed: memberAccountContextEntry(ACCOUNT),
  };
  const host = document.createElement("div");
  host.innerHTML = SECTION_HTML[section.type]!(section, ctx);
  return shapeOf(host.children);
}

function previewShape(section: SiteSection): string[] {
  const { container } = render(
    <MemberAccountPanelSection
      section={section}
      pages={[]}
      currentPath="/member/account"
      docs={[]}
      renderChildren={() => null}
    />,
  );
  return shapeOf(container.children);
}

beforeAll(() => {
  registerMemberAccountSection();
});

describe("账户面板：预览与 SSR 同构", () => {
  it("默认状态（抬头 + 资料 + 改密码 + 退出）", () => {
    const section = fixture();
    expect(previewShape(section)).toEqual(ssrShape(section));
  });

  it("关掉修改密码：整个抽屉（summary + 表单）一起消失", () => {
    const section = fixture({ show_password: false });
    const shape = previewShape(section);
    expect(shape).toEqual(ssrShape(section));
    expect(
      shape.filter((row) => row.includes("member-account-disclosure")),
    ).toHaveLength(0);
    // 资料块还在（卡的直接子节点，带 shapeOf 的两格缩进）
    expect(shape).toContain("  section.member-account-block");
  });

  it("关掉注册时间 / 上次登录", () => {
    const section = fixture({ show_meta: false });
    const shape = previewShape(section);
    expect(shape).toEqual(ssrShape(section));
    expect(
      shape.filter((row) => row.includes("member-account-meta")),
    ).toHaveLength(0);
  });

  it("关掉卡片外框：两端都退成 is-plain", () => {
    const section = fixture({ show_card: false });
    expect(previewShape(section)).toEqual(ssrShape(section));
    expect(previewShape(section)[0]).toBe(
      "div.member-auth-card is-plain member-account-card",
    );
  });

  it("抬头留空就不占位", () => {
    const section = fixture({ heading: "", subheading: "" });
    expect(previewShape(section)).toEqual(ssrShape(section));
  });
});

describe("SSR 面板", () => {
  it("拿不到上下文就不渲染——绝不吐一个空账户面板", () => {
    const html = SECTION_HTML[MEMBER_ACCOUNT_PANEL_SECTION_TYPE]!(fixture(), {});
    expect(html).toBe("");
  });

  it("三张表单各带自己的 intent，全是真 POST", () => {
    const html = SECTION_HTML[MEMBER_ACCOUNT_PANEL_SECTION_TYPE]!(fixture(), {
      contributed: memberAccountContextEntry(ACCOUNT),
    });
    for (const intent of ["profile", "password", "logout"]) {
      expect(html).toContain(`value="${intent}"`);
    }
    expect(html.match(/method="post"/gu)).toHaveLength(3);
  });

  it("邮箱只在身份条上露个面，卡里唯一能改的是昵称", () => {
    const html = SECTION_HTML[MEMBER_ACCOUNT_PANEL_SECTION_TYPE]!(fixture(), {
      contributed: memberAccountContextEntry({
        ...ACCOUNT,
        email: "member@example.com",
        display_name: "示例会员",
      }),
    });
    expect(html).toContain(
      '<p class="member-account-who-email">member@example.com</p>',
    );
    // 头像取昵称的前两个字；邮箱不再是任何一个输入框的值
    expect(html).toContain(
      '<span class="member-account-avatar" aria-hidden="true">示例</span>',
    );
    expect(html).not.toContain("member@example.com\" />");
    expect(html.match(/<input id=/gu)).toHaveLength(4);
    expect(html).toContain('name="display_name"');
  });

  it("没填昵称的会员：名字位顶邮箱，底下不再重复一遍", () => {
    const html = SECTION_HTML[MEMBER_ACCOUNT_PANEL_SECTION_TYPE]!(fixture(), {
      contributed: memberAccountContextEntry({
        ...ACCOUNT,
        email: "member@example.com",
        display_name: "",
      }),
    });
    expect(html).toContain(
      '<p class="member-account-who-name">member@example.com</p>',
    );
    expect(html).not.toContain("member-account-who-email");
  });

  it("改密码平时收着；这一块填错了就展开着回来", () => {
    const closed = SECTION_HTML[MEMBER_ACCOUNT_PANEL_SECTION_TYPE]!(fixture(), {
      contributed: memberAccountContextEntry(ACCOUNT),
    });
    expect(closed).toContain('<details class="member-account-block member-account-disclosure">');

    const reopened = SECTION_HTML[MEMBER_ACCOUNT_PANEL_SECTION_TYPE]!(
      fixture(),
      {
        contributed: memberAccountContextEntry({
          ...ACCOUNT,
          error: "原密码不正确",
          intent: "password",
        }),
      },
    );
    expect(reopened).toContain(
      '<details class="member-account-block member-account-disclosure" open>',
    );
  });

  it("改昵称填错了不牵连改密码那一块", () => {
    const html = SECTION_HTML[MEMBER_ACCOUNT_PANEL_SECTION_TYPE]!(fixture(), {
      contributed: memberAccountContextEntry({
        ...ACCOUNT,
        error: "昵称太长",
        intent: "profile",
      }),
    });
    expect(html).not.toContain("member-account-disclosure\" open");
  });

  it("提示与错误各走各的样式钩子", () => {
    const notice = SECTION_HTML[MEMBER_ACCOUNT_PANEL_SECTION_TYPE]!(fixture(), {
      contributed: memberAccountContextEntry({ ...ACCOUNT, notice: "已保存" }),
    });
    expect(notice).toContain('class="member-auth-notice"');
    const error = SECTION_HTML[MEMBER_ACCOUNT_PANEL_SECTION_TYPE]!(fixture(), {
      contributed: memberAccountContextEntry({ ...ACCOUNT, error: "原密码不正确" }),
    });
    expect(error).toContain('class="member-auth-error"');
  });
});
