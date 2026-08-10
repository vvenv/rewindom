import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const MemberOAuthCallback = lazy(() =>
  import("../pages/member-oauth-callback.js").then((module) => ({
    default: module.MemberOAuthCallback,
  })),
);

/**
 * SPA 上只剩 OAuth 回调这一条会员路由。
 *
 * 走 public 而非 guest 路由树：`GuestOnlyRoute` 会把已登录的工作台用户重定向到
 * `/app`——运营者一边登着后台一边看自己站点的会员页是常态，被踢走就没法测。
 *
 * **登录 / 注册 / 我的账户都不在这里**：三张都是租户可排版的模板页，由服务端 SSR
 *（`server/member-auth.ssr.ts`、`server/member-account.ssr.ts`），表单是真
 * `<form method="post">`。回调页留在 SPA 是因为它没有版式可言——它只是把 URL 里的
 * code 换成会话，然后立刻跳走。
 */
export function renderSiteMemberPublicRoutes(): ReactNode {
  return (
    <>
      <Route path="/member/oauth/callback" element={<MemberOAuthCallback />} />
    </>
  );
}
