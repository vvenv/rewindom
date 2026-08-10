/**
 * 会员认证段的 SSR 行为。
 *
 * 盯的是三条不能破的性质：**没有上下文就什么都不渲染**（这一段被摆错了地方）、
 * 渲染出来的是**真表单**（无 JS 也能提交）、以及 redirect 原样带下去（登录后回原处）。
 */

import { beforeAll, describe, expect, it } from "vitest";

import { createSection } from "../../marketing/shared/section-schema.js";
import { renderSectionHtml } from "../../marketing/shared/sections/html.js";
import { TENANT_SITE_MEMBER_ENTITLEMENT } from "../shared/entitlements.js";
import {
  MEMBER_LOGIN_FORM_SECTION_TYPE,
  MEMBER_REGISTER_FORM_SECTION_TYPE,
  memberAuthContextEntry,
  type MemberAuthRenderContext,
} from "../shared/member-auth-section.js";

import { registerMemberAuthSections } from "./member-auth-section.js";

const ENABLED = new Set([TENANT_SITE_MEMBER_ENTITLEMENT.key]);

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

function render(
  type: string,
  auth: MemberAuthRenderContext | null,
  settings: Record<string, unknown> = {},
): string {
  const section = createSection(type);
  section.settings = { ...section.settings, ...settings } as never;
  return renderSectionHtml(section, 0, {
    locale: "zh-CN",
    defaultLocale: "zh-CN",
    enabledEntitlements: ENABLED,
    ...(auth ? { contributed: memberAuthContextEntry(auth) } : {}),
  });
}

beforeAll(() => {
  registerMemberAuthSections();
});

describe("登录表单段", () => {
  it("拿不到上下文就不渲染——绝不吐一个 action 为空的登录框", () => {
    expect(render(MEMBER_LOGIN_FORM_SECTION_TYPE, null)).not.toContain(
      "<form",
    );
  });

  it("渲染真 form：method=post、邮箱与密码、隐藏的 redirect", () => {
    const html = render(MEMBER_LOGIN_FORM_SECTION_TYPE, AUTH);
    expect(html).toContain('method="post"');
    expect(html).toContain(
      'action="/member/login?redirect=%2Fmember%2Faccount"',
    );
    expect(html).toContain('name="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain(
      '<input type="hidden" name="redirect" value="/member/account" />',
    );
  });

  it("上一次提交的错误回显，邮箱回填（密码不回填）", () => {
    const html = render(MEMBER_LOGIN_FORM_SECTION_TYPE, {
      ...AUTH,
      error: "邮箱或密码不正确",
      email: "a@example.com",
    });
    expect(html).toContain("邮箱或密码不正确");
    expect(html).toContain('value="a@example.com"');
    expect(html).not.toContain('type="password" autocomplete="current-password" required value=');
  });

  it("验证码开启时留挂点与隐藏字段，交给 site-enhance 填滑块", () => {
    const html = render(MEMBER_LOGIN_FORM_SECTION_TYPE, {
      ...AUTH,
      captcha_enabled: true,
    });
    expect(html).toContain('data-member-captcha="/api/captcha/challenge"');
    expect(html).toContain('name="captcha"');
  });

  it("OAuth 是链接而不是按钮——没有 JS 也点得动，且带着 redirect", () => {
    const html = render(MEMBER_LOGIN_FORM_SECTION_TYPE, {
      ...AUTH,
      github_oauth_enabled: true,
    });
    expect(html).toContain(
      'href="/api/member/oauth/github?redirect=%2Fmember%2Faccount"',
    );
    expect(html).not.toContain("/api/member/oauth/google");
  });

  it("关掉「显示第三方登录」就整块不渲染", () => {
    const html = render(
      MEMBER_LOGIN_FORM_SECTION_TYPE,
      { ...AUTH, github_oauth_enabled: true },
      { show_oauth: false },
    );
    expect(html).not.toContain("/api/member/oauth/github");
  });

  it("租户没开通会员时不渲染（贡献段的 entitlement 闸门）", () => {
    const section = createSection(MEMBER_LOGIN_FORM_SECTION_TYPE);
    const html = renderSectionHtml(section, 0, {
      enabledEntitlements: new Set<string>(),
      contributed: memberAuthContextEntry(AUTH),
    });
    expect(html).toBe("");
  });
});

describe("注册表单段", () => {
  it("默认带昵称字段，关掉就没有", () => {
    expect(render(MEMBER_REGISTER_FORM_SECTION_TYPE, AUTH)).toContain(
      'name="display_name"',
    );
    expect(
      render(MEMBER_REGISTER_FORM_SECTION_TYPE, AUTH, {
        show_display_name: false,
      }),
    ).not.toContain('name="display_name"');
  });

  it("密码用 new-password：浏览器该提示存新密码而不是填旧的", () => {
    expect(render(MEMBER_REGISTER_FORM_SECTION_TYPE, AUTH)).toContain(
      'autocomplete="new-password"',
    );
  });
});
