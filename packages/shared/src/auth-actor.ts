/** JWT / request context actor classification. */
export type AuthActorType = "tenant_user" | "platform_admin" | "api_key";

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
