/**
 * 会员认证段**两端渲染的结构对齐**守卫。
 *
 * marketing 的 `section-structure.test.tsx` 只遍历内置段，贡献段不在它的名单里——
 * 于是预览整整少画了抬头与第三方登录按钮，站长在编辑器里看到的和访客看到的不是
 * 一个东西，而没有任何一条测试变红。这里把这两段补上。
 *
 * 比的是顶层元素的「标签 + class」：够粗，不会因为 SSR 才有的 hidden input 或
 * `action` 属性误报；够细，少一层包装（比如整块 OAuth）一定抓得到。
 */

import { render } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSection,
  type SiteSection,
} from "../../../marketing/shared/section-schema.js";
import { SECTION_HTML } from "../../../marketing/shared/sections/html.js";
import { registerMemberAuthSections } from "../../server/member-auth-section.js";
import {
  MEMBER_LOGIN_FORM_SECTION_TYPE,
  MEMBER_REGISTER_FORM_SECTION_TYPE,
  memberAuthContextEntry,
  type MemberAuthRenderContext,
} from "../../shared/member-auth-section.js";

import {
  MemberLoginFormSection,
  MemberRegisterFormSection,
} from "./MemberAuthFormSection.js";

import type { SectionRenderContext } from "../../../marketing/shared/sections/render-context.js";

/** 预览侧的「哪几家 OAuth / 验证码开没开」来自 `/api/public/config`。 */
const { publicConfig } = vi.hoisted(() => ({
  publicConfig: {
    captcha_enabled: false,
    github_oauth_enabled: false,
    google_oauth_enabled: false,
    microsoft_oauth_enabled: false,
  },
}));

vi.mock("@rewindom/client-kit", () => ({
  usePublicConfig: () => ({ data: publicConfig, isLoading: false }),
}));

const AUTH: MemberAuthRenderContext = {
  action: "/member/login?redirect=%2Fmember%2Faccount",
  redirect: "/member/account",
  alt_href: "/member/register?redirect=%2Fmember%2Faccount",
  captcha_enabled: false,
  github_oauth_enabled: false,
  google_oauth_enabled: false,
  microsoft_oauth_enabled: false,
  error: null,
  email: "",
  captcha_challenge_path: "/api/captcha/challenge",
};

/**
 * 认证卡与卡里各块的「标签 + class」。
 *
 * 只比两层：段的产物就是一张卡，卡里是抬头 / OAuth / 表单 / 换页链接那几块——
 * 少一块、顺序换了、卡的 modifier 没跟上，都在这份清单里看得见。再往里（hidden input、
 * `action`、按钮 type）两端本来就该不一样，比进来只会误报。
 */
function shapeOf(nodes: Iterable<Element>): string[] {
  return [...nodes].flatMap((el) => [
    `${el.tagName.toLowerCase()}.${el.className || "-"}`,
    ...[...el.children].map(
      (child) => `  ${child.tagName.toLowerCase()}.${child.className || "-"}`,
    ),
  ]);
}

function fixture(
  type: string,
  settings: Record<string, unknown> = {},
): SiteSection {
  const section = createSection(type);
  // 有抬头才看得出 sectionHeading 那一层在不在
  section.settings = {
    ...section.settings,
    heading: "登录",
    subheading: "欢迎回来",
    ...settings,
  } as never;
  return section;
}

function ssrShape(section: SiteSection): string[] {
  const ctx: SectionRenderContext = {
    contributed: memberAuthContextEntry({
      ...AUTH,
      captcha_enabled: publicConfig.captcha_enabled,
      github_oauth_enabled: publicConfig.github_oauth_enabled,
      google_oauth_enabled: publicConfig.google_oauth_enabled,
      microsoft_oauth_enabled: publicConfig.microsoft_oauth_enabled,
    }),
  };
  const host = document.createElement("div");
  host.innerHTML = SECTION_HTML[section.type]!(section, ctx);
  return shapeOf(host.children);
}

function previewShape(section: SiteSection): string[] {
  const View =
    section.type === MEMBER_LOGIN_FORM_SECTION_TYPE
      ? MemberLoginFormSection
      : MemberRegisterFormSection;
  const { container } = render(
    <View
      section={section}
      pages={[]}
      currentPath="/member/login"
      renderChildren={() => null}
    />,
  );
  return shapeOf(container.children);
}

beforeAll(() => {
  registerMemberAuthSections();
});

beforeEach(() => {
  Object.assign(publicConfig, {
    captcha_enabled: false,
    github_oauth_enabled: false,
    google_oauth_enabled: false,
    microsoft_oauth_enabled: false,
  });
});

describe.each([
  ["登录表单", MEMBER_LOGIN_FORM_SECTION_TYPE],
  ["注册表单", MEMBER_REGISTER_FORM_SECTION_TYPE],
])("%s 段：预览与 SSR 同构", (_label, type) => {
  it("默认状态（抬头 + 表单 + 另一张页面的入口）", () => {
    const section = fixture(type);
    expect(previewShape(section)).toEqual(ssrShape(section));
  });

  it("配了第三方登录：按钮行与分隔线都在，且排在表单上面", () => {
    publicConfig.github_oauth_enabled = true;
    publicConfig.google_oauth_enabled = true;
    const section = fixture(type);
    const shape = previewShape(section);
    expect(shape).toEqual(ssrShape(section));
    expect(shape.join("\n")).toContain("member-auth-oauth-row");
    expect(shape.findIndex((s) => s.includes("member-auth-oauth-row"))).
      toBeLessThan(shape.findIndex((s) => s.includes("form.member-auth")));
  });

  it("一家 OAuth 都没配：整块不画，不留一条孤零零的分隔线", () => {
    const shape = previewShape(fixture(type));
    expect(shape.join("\n")).not.toContain("member-auth-divider");
  });

  it("关掉「显示第三方登录」", () => {
    publicConfig.github_oauth_enabled = true;
    const section = fixture(type, { show_oauth: false });
    expect(previewShape(section)).toEqual(ssrShape(section));
  });

  it("抬头留空就不占位", () => {
    const section = fixture(type, { heading: "", subheading: "" });
    expect(previewShape(section)).toEqual(ssrShape(section));
    expect(previewShape(section).join("\n")).not.toContain("member-auth-head");
  });

  it("关掉卡片外框：两端都退成 is-plain", () => {
    const section = fixture(type, { show_card: false });
    const shape = previewShape(section);
    expect(shape).toEqual(ssrShape(section));
    expect(shape[0]).toBe("div.member-auth-card is-plain");
  });

  it("清掉链接文案就没有那一行", () => {
    const section = fixture(type, { alt_label: "" });
    expect(previewShape(section)).toEqual(ssrShape(section));
  });
});

describe("预览不是第二个登录入口", () => {
  it("表单不带 action，输入框只读", () => {
    const { container } = render(
      <MemberLoginFormSection
        section={fixture(MEMBER_LOGIN_FORM_SECTION_TYPE)}
        pages={[]}
        currentPath="/member/login"
        renderChildren={() => null}
      />,
    );
    const form = container.querySelector("form")!;
    expect(form.getAttribute("action")).toBeNull();
    expect(form.querySelector<HTMLInputElement>("#preview-email")!.readOnly).toBe(
      true,
    );
    // 提交按钮是 type=button：点它连 submit 事件都不该有
    expect(
      container.querySelector<HTMLButtonElement>(".member-auth-submit")!.type,
    ).toBe("button");
  });

  it("验证码开启时画出滑块的静止态（真页面上这块由 site-enhance 填）", () => {
    publicConfig.captcha_enabled = true;
    const { container } = render(
      <MemberLoginFormSection
        section={fixture(MEMBER_LOGIN_FORM_SECTION_TYPE)}
        pages={[]}
        currentPath="/member/login"
        renderChildren={() => null}
      />,
    );
    expect(container.querySelector(".member-auth-captcha-track")).not.toBeNull();
  });
});
