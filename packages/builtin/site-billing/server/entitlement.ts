import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { SITE_BILLING_ENTITLEMENT } from "../shared/entitlements.js";

export function isSiteBillingEnabled(tenantId: string): Promise<boolean> {
  return isTenantModuleEnabled(tenantId, SITE_BILLING_ENTITLEMENT.key);
}
