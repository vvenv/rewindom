/** JWT / request context actor classification. */
export type AuthActorType =
  | "tenant_user"
  | "platform_admin"
  | "api_key"
  | "site_member";

export function isPlatformAdminActor(
  actorType: AuthActorType | undefined,
): boolean {
  return actorType === "platform_admin";
}

export function isTenantUserActor(
  actorType: AuthActorType | undefined,
): boolean {
  return actorType === "tenant_user";
}

/**
 * 站点会员：租户站点前台注册的终端客户，只能访问站点面 API，不进工作台。
 * 身份存在独立的 `SiteMember` 表，不在 `User` 表里。
 */
export function isSiteMemberActor(
  actorType: AuthActorType | undefined,
): boolean {
  return actorType === "site_member";
}
