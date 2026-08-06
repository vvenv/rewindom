import { describe, expect, it } from "vitest";

import {
  isMemberAreaPath,
  MEMBER_ACCOUNT_PATH,
  MEMBER_LOGIN_PATH,
  memberLoginHref,
  resolveMemberRedirect,
} from "./member-routes.js";

describe("memberLoginHref", () => {
  it("carries the current path as the redirect target", () => {
    expect(memberLoginHref("/docs/guide")).toBe(
      `${MEMBER_LOGIN_PATH}?redirect=${encodeURIComponent("/docs/guide")}`,
    );
  });

  // 已经在登录页时再塞一个指向自己的 redirect，登录后会原地打转
  it("drops the redirect when already on the login page", () => {
    expect(memberLoginHref(MEMBER_LOGIN_PATH)).toBe(MEMBER_LOGIN_PATH);
    expect(memberLoginHref()).toBe(MEMBER_LOGIN_PATH);
  });
});

describe("resolveMemberRedirect", () => {
  it("keeps in-site absolute paths", () => {
    expect(resolveMemberRedirect("/pricing")).toBe("/pricing");
  });

  it("rejects anything that could leave the site", () => {
    expect(resolveMemberRedirect("//evil.com")).toBe(MEMBER_ACCOUNT_PATH);
    expect(resolveMemberRedirect("https://evil.com")).toBe(MEMBER_ACCOUNT_PATH);
    expect(resolveMemberRedirect(null)).toBe(MEMBER_ACCOUNT_PATH);
  });
});

describe("isMemberAreaPath", () => {
  it("matches the member area", () => {
    expect(isMemberAreaPath("/member")).toBe(true);
    expect(isMemberAreaPath(MEMBER_ACCOUNT_PATH)).toBe(true);
    expect(isMemberAreaPath("/member/login")).toBe(true);
  });

  it("leaves ordinary site pages alone", () => {
    expect(isMemberAreaPath("/")).toBe(false);
    expect(isMemberAreaPath("/pricing")).toBe(false);
  });

  // 站长可以建一个叫 `members` 的页面，它不是会员专区
  it("does not match a page whose slug merely starts with member", () => {
    expect(isMemberAreaPath("/members")).toBe(false);
    expect(isMemberAreaPath("/membership")).toBe(false);
  });
});
