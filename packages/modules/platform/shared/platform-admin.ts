import type { RoleSummary } from "@be-water/shared";

export interface PlatformAdminListItem {
  id: string;
  username: string;
  is_system_admin: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  last_access_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  roles: Array<Pick<RoleSummary, "id" | "name" | "description" | "is_builtin">>;
}

export interface CreatePlatformAdminBody {
  username: string;
  password: string;
  is_system_admin?: boolean;
  enabled?: boolean;
  role_ids?: string[];
}

export interface UpdatePlatformAdminBody {
  is_system_admin?: boolean;
  enabled?: boolean;
  role_ids?: string[];
}

export interface ResetPlatformAdminPasswordBody {
  new_password: string;
}

export interface PlatformRoleSummary {
  id: string;
  name: string;
  description: string | null;
  scope: "platform";
  is_builtin: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface PlatformRoleInput {
  name: string;
  description?: string;
  permissions: string[];
}
