/** Kernel / 跨模块通用 API 消息（英文）。 */
export const KERNEL_MESSAGES_EN: Record<string, string> = {
  "common.unauthorized": "Unauthorized",
  "common.forbidden": "Insufficient permissions",
  "common.forbidden_access": "Access denied",
  "common.forbidden_permission": "Access denied: insufficient permissions",
  "common.validation_error": "Invalid parameters",
  "common.conflict": "Resource conflict",
  "common.not_found": "Resource not found",
  "common.resource_not_found": "{{resource}} not found",
  "common.internal_error": "Internal server error",
  "common.request_failed": "Request failed",
  "common.unknown_error": "Unknown error",
  "common.create_failed": "Create failed",
  "common.update_failed": "Update failed",
  "common.delete_failed": "Delete failed",
  "common.endpoint_not_found": "Endpoint not found",
  "common.invalid_request": "Invalid request parameters",
  "common.session_expired": "Session expired, please sign in again",
  "common.no_permission_resource": "No permission to access this resource",
  "common.insufficient_permissions":
    "Insufficient permissions for this operation",
  "common.required_fields_missing": "Required fields are missing",
  "common.no_fields_to_update": "No fields to update",
  "common.file_required": "Please upload a file",
  "common.file_too_large": "File too large",
  "common.unsupported_file_type": "Unsupported file type",
  "common.import_failed": "Import failed",
  "common.export_failed": "Export failed",

  "auth.invalid_credentials": "Incorrect username or password",
  "auth.account_disabled": "Account is disabled",
  "auth.account_locked": "Account is locked",
  "auth.account_locked_retry":
    "Account locked after too many failed sign-ins; try again in 30 minutes",
  "auth.captcha_invalid": "Captcha verification failed",
  "auth.captcha_expired": "Captcha expired",
  "auth.captcha_required": "Please complete captcha verification",
  "auth.token_invalid_type": "Invalid token type",
  "auth.token_invalid_or_expired": "Token is invalid or expired",
  "auth.refresh_failed": "Token refresh failed",
  "auth.refresh_paused": "Token refresh paused",
  "auth.refresh_missing": "No refresh token available",
  "auth.refresh_expired": "Refresh token expired",
  "auth.refresh_invalid": "Invalid refresh token",
  "auth.refresh_required": "Please provide a refresh token",
  "auth.login_failed": "Sign-in failed",
  "auth.register_failed": "Registration failed",
  "auth.credentials_required": "Please enter username and password",
  "auth.password_required": "Password is required",
  "auth.password_min_6": "Password must be at least 6 characters",
  "auth.password_min_8": "Password must be at least 8 characters",
  "auth.password_need_upper": "Password must contain an uppercase letter",
  "auth.password_need_lower": "Password must contain a lowercase letter",
  "auth.password_need_digit": "Password must contain a number",
  "auth.username_required": "Username is required",
  "auth.username_invalid": "Invalid username format",
  "auth.username_length": "Username must be 3–50 characters",
  "auth.username_charset":
    "Username may only contain letters, numbers, underscores, and hyphens",
  "auth.username_exists": "Username already exists",
  "auth.username_immutable": "Username cannot be changed",
  "auth.cannot_delete_self": "You cannot delete your own account",
  "auth.cannot_delete_self_short": "You cannot delete yourself",
  "auth.old_password_wrong": "Incorrect current password",
  "auth.password_not_set":
    "This account has no password; use third-party login or ask an admin to reset it",
  "auth.oauth_not_configured": "GitHub login is not configured",
  "auth.oauth_state_invalid":
    "GitHub login state is invalid or expired; please try again",
  "auth.oauth_exchange_failed": "Failed to exchange GitHub authorization",
  "auth.oauth_profile_failed": "Failed to fetch GitHub profile",
  "auth.oauth_denied": "GitHub authorization was cancelled",
  "auth.oauth_failed": "GitHub login failed; please try again",
  "auth.oauth_registration_disabled":
    "Self-registration is closed; ask an admin for an account before using GitHub login",
  "auth.oauth_already_linked": "This GitHub account is already linked",
  "auth.audit.login_oauth_github": "Signed in with GitHub",
  "auth.audit.login_oauth_google": "Signed in with Google",
  "auth.new_password_same": "New password must differ from the current password",
  "auth.passwords_mismatch": "Passwords do not match",
  "auth.new_password_invalid": "New password does not meet requirements",
  "auth.change_password_fields_required":
    "Please enter the current and new passwords",
  "auth.new_password_required": "Please enter a new password",
  "auth.password_change_unsupported":
    "This account does not support password changes",
  "auth.platform_admin_tenant_api_denied":
    "Platform admins cannot access tenant APIs",
  "auth.platform_admin_required":
    "Access denied: platform admin permission required",
  "auth.tenant_system_admin_required":
    "Access denied: tenant system admin permission required",
  "auth.api_key_forbidden": "API key is not allowed for this endpoint",
  "auth.api_key_invalid": "API key is invalid or revoked",
  "auth.phone_required": "Phone number is required",
  "auth.phone_invalid": "Invalid phone number format",
  "auth.email_required": "Email is required",
  "auth.email_invalid": "Invalid email format",
  "auth.audit.login_success": "User signed in",
  "auth.audit.logout_success": "User signed out",
  "auth.audit.password_changed": "User changed password",

  "user.not_found": "User not found",
  "user.not_found_batch": "User not found: {{ids}}",
  "user.disabled": "User account is disabled",
  "user.username_reserved": "This username is reserved",
  "user.id_required": "User id is required",
  "user.ids_required": "Please provide user ids",

  "tenant.not_found": "Tenant not found",
  "tenant.archived": "Tenant is archived",
  "tenant.pending": "Tenant is pending approval",
  "tenant.suspended": "Tenant is suspended",
  "tenant.suspended_or_missing": "Tenant is suspended or does not exist",
  "tenant.slug_exists": "Tenant slug already exists",
  "tenant.slug_required": "Tenant slug is required",
  "tenant.slug_invalid": "Invalid tenant slug format",
  "tenant.slug_reserved": "This tenant slug is reserved",
  "tenant.name_required": "Tenant name is required",
  "tenant.registration_disabled": "Self-registration is disabled",
  "tenant.single_tenant_mode":
    "This deployment is single-tenant; creating tenants is disabled",
  "tenant.default_unavailable":
    "Default tenant is unavailable; contact an administrator",
  "tenant.status_invalid": "Invalid tenant status",
  "tenant.plan_ends_at_invalid": "Invalid expiration time",
  "tenant.default_slug_immutable": "Default tenant slug cannot be changed",
  "tenant.default_not_archivable": "Default tenant cannot be archived",
  "tenant.default_not_suspendable": "Default tenant cannot be suspended",
  "tenant.default_not_suspendable_or_archivable":
    "Default tenant cannot be suspended or archived",
  "tenant.slug_and_name_required": "Please provide slug and name",
  "tenant.appearance_fields_required":
    "Please provide theme, layout, or locale",
  "tenant.plan_fields_required": "Please provide plan or plan_ends_at",
  "tenant.org_name_required": "Organization name is required",
  "tenant.org_name_length": "Organization name must be 2–50 characters",
  "tenant.secret_invalid": "Invalid tenant secret ciphertext",
  "tenant.impersonate_active_only":
    "Impersonation is only allowed for active tenants",
  "tenant.impersonate_account_unavailable":
    "Impersonation account unavailable",
  "tenant.impersonate_user_missing":
    "Target user does not exist or does not belong to this tenant",
  "tenant.impersonate_user_disabled": "Target user is disabled",
  "tenant.patch_fields_required":
    "Please provide slug, name, remark, status, or custom_domain",
  "tenant.domain_exists": "This custom domain is already bound to another tenant",
  "tenant.domain_invalid":
    "Invalid custom domain (hostname only, no scheme or port)",
  "tenant.domain_reserved":
    "Cannot bind the platform primary domain or a reserved hostname",
  "tenant.host_mismatch": "Current domain does not match the signed-in tenant",
  "tenant.host_platform_forbidden":
    "Platform console is not available on a tenant custom domain",
  "auth.tenant_host_mismatch":
    "Account organization does not match the current domain",

  "role.not_found": "Role not found",
  "role.name_required": "Role name is required",
  "role.name_exists": "Role name already exists",
  "role.builtin_immutable": "Built-in roles cannot change permissions",
  "role.builtin_undeletable": "Built-in roles cannot be deleted",
  "role.invalid_roles": "Contains invalid roles",
  "role.create_failed": "Failed to create role",
  "role.update_failed": "Failed to update role",
  "role.delete_failed": "Failed to delete role",
  "role.roles_must_be_array": "Roles must be an array",
  "role.system_admin_immutable": "Cannot modify system admin roles",
  "permission.invalid": "Invalid permission",
  "permission.invalid_list": "Invalid permissions: {{permissions}}",
  "permission.must_be_array": "Permissions must be an array",

  "notification.not_found": "Notification not found",
  "notification.marked_all_read": "All notifications marked as read",

  "job.not_found": "Job not found",
  "job.cancelled": "Job cancelled",
  "job.failed": "Job failed",
  "job.created_waiting": "Job created, waiting to run…",
  "job.timed_out": "Job timed out, please retry",
  "job.cancelled_success": "Background job cancelled",

  "locale.invalid": "Invalid locale",
  "theme.invalid": "Invalid theme",
  "layout.invalid": "Invalid layout",
  "plan.invalid": "Invalid plan",

  "platform.admin_not_found": "Admin not found",
  "platform.admin_not_found_alt": "Platform admin not found",
  "platform.admin_last_system_required":
    "At least one system admin must remain",
  "platform.password_reset_failed": "Password reset failed",
  "platform.feature_disabled":
    "{{label}} is disabled; contact a platform admin",
  "platform.limit_exceeded":
    "Reached {{label}} ({{limit}}). Contact a platform admin to upgrade your plan",
  "platform.database_url_missing": "DATABASE_URL is not configured",
  "platform.backup_not_ready": "Backup is not ready yet",
  "platform.backup_missing_or_expired":
    "Backup file does not exist or has expired",
  "platform.backup_path_absolute": "Backup path must be absolute",
  "platform.backup_path_required": "Please provide a backup file path",
  "platform.backup_download_invalid": "Download link is invalid or expired",
  "platform.backup_failed": "Backup failed",
  "platform.restore_failed": "Restore failed",
  "platform.restore_paths_missing":
    "No local restore directory configured (DATABASE_RESTORE_LOCAL_PATHS)",
  "platform.path_not_file": "Path is not a file",
  "platform.backup_path_not_allowed": "Backup path is outside allowed directories",
  "platform.public_settings_failed": "Failed to load public settings",
  "platform.max_users_integer": "Max users must be an integer",
  "platform.max_users_min": "Max users cannot be less than 1",

  "billing.plan_slug_required": "plan_slug is required",
  "billing.plan_not_self_serve": "This plan does not support self-serve purchase",
  "billing.creem_api_key_missing_checkout":
    "CREEM_API_KEY is not configured; cannot start checkout",
  "billing.creem_api_key_missing_cancel":
    "CREEM_API_KEY is not configured; cannot cancel subscription",
  "billing.creem_webhook_secret_missing":
    "CREEM_WEBHOOK_SECRET is not configured",
  "billing.creem_checkout_url_missing": "Creem did not return checkout_url",
  "billing.no_cancellable_subscription": "No cancellable subscription",
  "billing.unknown_plan": "Unknown plan: {{plan_slug}}",
  "billing.product_unconfigured":
    "Plan {{plan_slug}} has no Creem product_id configured (CREEM_PRODUCT_MAP)",
  "billing.product_invalid":
    "Invalid Creem product_id: {{product_id}} (must start with prod_; check CREEM_PRODUCT_MAP)",
  "billing.product_missing":
    "Creem product {{product_id}} was not found; verify CREEM_SERVER and the Dashboard product",
  "billing.webhook_raw_body_missing": "Webhook raw request body is missing",
  "billing.webhook_failed": "Webhook processing failed",

  "error-log.not_found": "Error log not found",

  "notes.title_required": "Title is required",
  "notes.title_enter": "Please enter a title",
  "notes.title_too_long": "Title cannot exceed {{max}} characters",
  "notes.content_too_long": "Content cannot exceed {{max}} characters",
  "notes.not_found": "Note not found",

  "todos.title_required": "Please enter a title",
  "todos.title_too_long": "Title cannot exceed {{max}} characters",
  "todos.completed_must_be_boolean": "completed must be a boolean",
  "todos.not_found": "Todo not found",
};
