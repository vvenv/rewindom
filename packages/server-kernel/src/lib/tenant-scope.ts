export function withTenantScope<T extends Record<string, unknown>>(
  tenantId: string,
  where?: T,
): T & { tenant_id: string } {
  return {
    ...where,
    tenant_id: tenantId,
  } as T & { tenant_id: string };
}

export function assertTenantOwnership(
  rowTenantId: string | null | undefined,
  tenantId: string,
  message = "资源不存在",
): void {
  if (!rowTenantId || rowTenantId !== tenantId) {
    throw new Error(message);
  }
}
