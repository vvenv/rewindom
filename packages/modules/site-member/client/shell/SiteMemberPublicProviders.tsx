import type { ReactNode } from "react";

import { SiteMemberAuthProvider } from "../contexts/SiteMemberAuthContext.js";

/**
 * 公开路由树的会员上下文（`/member/*` 登录注册账户页）。
 *
 * 公开 CMS 页不再挂 React；页头入口与会员正文由 SSR + site-enhance 完成。
 */
export function SiteMemberPublicProviders({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <SiteMemberAuthProvider>{children}</SiteMemberAuthProvider>;
}
