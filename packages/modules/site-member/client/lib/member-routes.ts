export const MEMBER_LOGIN_PATH = "/member/login";
export const MEMBER_REGISTER_PATH = "/member/register";
export const MEMBER_ACCOUNT_PATH = "/member/account";

/** 会员专区的公共前缀。 */
const MEMBER_AREA_PREFIX = "/member";

/**
 * 这个路径是不是只有登录后才打得开。
 *
 * 退出登录时用来决定要不要送人回首页：会员专区退出后是一个空壳，留在原地等于
 * 把访客扔在一个再也加载不出内容的页面上。普通页面则不动——`visibility=members`
 * 的正文会自己降级成登录提示，把人踢走反而丢了浏览位置。
 */
export function isMemberAreaPath(pathname: string): boolean {
  return (
    pathname === MEMBER_AREA_PREFIX ||
    pathname.startsWith(`${MEMBER_AREA_PREFIX}/`)
  );
}

/**
 * 登录后的回跳目标。
 *
 * 只接受站内绝对路径：`redirect` 来自 URL，放行 `//evil.com` 或 `http://…`
 * 等于把站点做成开放重定向跳板。
 */
export function resolveMemberRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return MEMBER_ACCOUNT_PATH;
  }
  return raw;
}

/** 带回跳参数的会员登录链接。 */
export function memberLoginHref(currentPath?: string): string {
  if (!currentPath || currentPath.startsWith(MEMBER_LOGIN_PATH)) {
    return MEMBER_LOGIN_PATH;
  }
  return `${MEMBER_LOGIN_PATH}?redirect=${encodeURIComponent(currentPath)}`;
}
