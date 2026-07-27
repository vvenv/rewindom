/** Initial superuser created when a tenant is provisioned. */
export const TENANT_INITIAL_ADMIN_USERNAME = "admin";

import type { PlanSlug } from "./pricing-plans.js";

export type TenantStatus = "active" | "suspended" | "archived";

export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  remark: string | null;
  status: TenantStatus;
  plan: PlanSlug;
  plan_since: string | null;
  plan_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantStats {
  document_count: number;
  product_count: number;
  analysis_count: number;
  user_count: number;
}

export interface CreateTenantBody {
  slug: string;
  name: string;
  remark?: string | null;
}

export interface PatchTenantBody {
  slug?: string;
  name?: string;
  remark?: string | null;
  status?: TenantStatus;
}

export interface UpdateTenantPlanBody {
  plan?: PlanSlug;
  /** ISO 8601；传 null 表示清除到期时间（永久有效） */
  plan_ends_at?: string | null;
}

export interface TenantAdminCredentials {
  username: string;
  password: string;
  login_identifier: string;
  /** True when the admin account was missing and has been recreated. */
  recreated?: boolean;
}

export interface TenantCreated extends TenantSummary {
  admin: TenantAdminCredentials;
}

export interface ResetTenantAdminPasswordBody {
  new_password?: string;
}

export interface TenantIntegrationStatus {
  openai_api: {
    configured: boolean;
    updated_at: string | null;
  };
}

export interface PlatformUserSummary {
  id: string;
  username: string;
  is_system_admin: boolean;
  enabled: boolean;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  created_at: string;
  last_login_at: string | null;
}

export interface ImpersonateTenantResult {
  user: {
    id: string;
    username: string;
    actor_type: "tenant_user";
    is_system_admin: boolean;
    enabled: boolean;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  tenant_slug: string;
  tenant_name: string;
  login_identifier: string;
}
