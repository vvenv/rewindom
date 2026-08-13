import { describe, expect, it } from "vitest";

import {
  assembleModuleSiteCss,
  listHandwrittenModuleCssTs,
} from "../../scripts/assemble-module-css.mjs";

import {
  MEMBER_ACCOUNT_CSS,
  MEMBER_AUTH_CSS,
  MEMBER_GATE_CSS,
} from "./site-css.generated.js";

describe("site-member site-css 生成物", () => {
  it("与 site-css/*.css 真源一致（改了 css 要跑 assemble:module-css）", () => {
    expect(assembleModuleSiteCss("site-member")).toEqual({
      MEMBER_ACCOUNT_CSS,
      MEMBER_AUTH_CSS,
      MEMBER_GATE_CSS,
    });
  });

  it("账户页自带认证卡样式（SSR 按段发 CSS，蹭不到登录段那份）", () => {
    expect(MEMBER_ACCOUNT_CSS).toContain(".member-auth-card{");
    expect(MEMBER_ACCOUNT_CSS).toContain(".member-account-identity");
  });

  it("设计注释在构建期剥掉，不发给访客", () => {
    for (const css of [MEMBER_ACCOUNT_CSS, MEMBER_AUTH_CSS, MEMBER_GATE_CSS]) {
      expect(css).not.toContain("/*");
      expect(css).not.toContain("@import");
    }
  });

  it("没有手写 shared/*-css.ts（真源只许 site-css/*.css）", () => {
    expect(listHandwrittenModuleCssTs()).toEqual([]);
  });
});
