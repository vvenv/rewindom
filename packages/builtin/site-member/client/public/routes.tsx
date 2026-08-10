import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const MemberAccount = lazy(() =>
  import("../pages/member-account.js").then((module) => ({
    default: module.MemberAccount,
  })),
);

const MemberOAuthCallback = lazy(() =>
  import("../pages/member-oauth-callback.js").then((module) => ({
    default: module.MemberOAuthCallback,
  })),
);

/**
 * 会员页走 public 而非 guest 路由树。
 *
 * `GuestOnlyRoute` 会把已登录的工作台用户重定向到 `/app`——运营者一边登着后台
 * 一边看自己站点的会员页是常态，被踢走就没法测。`/member/account` 自己按
 * 会员会话决定跳不跳登录页。
 *
 * **登录 / 注册页不在这里**：它们是租户可排版的模板页，由服务端 SSR
 *（`server/member-auth.ssr.ts`），表单是真 `<form method="post">`。
 */
export function renderSiteMemberPublicRoutes(): ReactNode {
  return (
    <>
      <Route path="/member/oauth/callback" element={<MemberOAuthCallback />} />
      <Route path="/member/account" element={<MemberAccount />} />
    </>
  );
}
