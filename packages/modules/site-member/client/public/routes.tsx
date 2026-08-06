import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const MemberLogin = lazy(() =>
  import("../pages/member-login.js").then((module) => ({
    default: module.MemberLogin,
  })),
);

const MemberRegister = lazy(() =>
  import("../pages/member-register.js").then((module) => ({
    default: module.MemberRegister,
  })),
);

const MemberAccount = lazy(() =>
  import("../pages/member-account.js").then((module) => ({
    default: module.MemberAccount,
  })),
);

/**
 * 会员页走 public 而非 guest 路由树。
 *
 * `GuestOnlyRoute` 会把已登录的工作台用户重定向到 `/app`——运营者一边登着后台
 * 一边看自己站点的会员页是常态，被踢走就没法测。`/member/account` 自己按
 * 会员会话决定跳不跳登录页。
 */
export function renderSiteMemberPublicRoutes(): ReactNode {
  return (
    <>
      <Route path="/member/login" element={<MemberLogin />} />
      <Route path="/member/register" element={<MemberRegister />} />
      <Route path="/member/account" element={<MemberAccount />} />
    </>
  );
}
