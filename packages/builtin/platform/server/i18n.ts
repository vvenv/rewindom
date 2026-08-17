import type { ServerI18nBundle } from "@rewindom/server-kernel/runtime/module-contract.js";

export const PLATFORM_SERVER_I18N: ServerI18nBundle = {
  id: "platform",
  messages: {
    "zh-CN": {
      "platform.audit.tenant_created":
        "创建租户 {{slug}}（{{name}}），管理员：{{admin}}",
      "platform.audit.tenant_updated":
        "更新租户 {{previous_slug}}→{{slug}}，状态：{{status}}",
      "platform.audit.tenant_certificate_issued":
        "为租户 {{slug}} 签发证书 {{names}}",
      "platform.audit.tenant_suspended": "暂停租户 {{slug}}",
      "platform.audit.tenant_resumed": "恢复租户 {{slug}}",
      "platform.audit.tenant_archived": "归档租户 {{slug}}",
      "platform.audit.tenant_admin_password_reset":
        "重置租户管理员 {{admin}} 的密码",
      "platform.audit.tenant_impersonated":
        "代登录租户 {{slug}} 的管理员 {{admin}}",
      "platform.audit.tenant_features_updated": "更新租户 {{slug}} 的功能开关",
      "platform.audit.tenant_entitlements_updated":
        "更新租户 {{slug}} 的能力开关",
      "platform.audit.tenant_appearance_updated":
        "更新租户 {{slug}} 的外观配置",
      "platform.audit.tenant_plan_updated": "更新租户 {{slug}} 的套餐",
      "platform.audit.tenant_registered":
        "注册租户 {{tenant_name}}（{{tenant_slug}}）",
      "platform.audit.user_joined_default":
        "用户自助注册加入默认租户 {{tenant_slug}}",
      "platform.audit.settings_updated": "更新平台设置",
      "platform.audit.openai_updated": "更新了 AI 接口配置",
      "platform.audit.plan_limit_templates_updated": "更新套餐用量模板",
      "platform.audit.background_job_cancelled": "取消后台任务 {{job}}",
      "platform.audit.background_job_cancelled_not_running":
        "取消后台任务 {{job}}（任务已不在运行）",
      "platform.audit.database_backed_up": "生成备份：{{filename}}",
      "platform.audit.database_restored": "从备份恢复：{{filename}}",
      "platform.audit.role_created":
        "创建平台角色 {{name}}，权限：{{permissions_text}}",
      "platform.audit.role_updated": "更新平台角色 {{name}}",
      "platform.audit.role_updated_with_permissions":
        "更新平台角色 {{name}}，权限：{{permissions_text}}",
      "platform.audit.role_deleted": "删除平台角色 {{name}}",
      "platform.audit.admin_created": "创建平台管理员 {{username}}",
      "platform.audit.admin_updated": "更新平台管理员 {{username}}",
      "platform.audit.admin_deleted": "删除平台管理员 {{username}}",
      "platform.audit.admin_password_reset":
        "重置平台管理员 {{username}} 的密码",
      "platform.audit.admin_roles_updated":
        "更新平台管理员 {{username}} 的角色：{{roles_text}}",
    },
    en: {
      "platform.audit.tenant_created":
        "Created tenant {{slug}} ({{name}}), admin: {{admin}}",
      "platform.audit.tenant_updated":
        "Updated tenant {{previous_slug}}→{{slug}}, status: {{status}}",
      "platform.audit.tenant_certificate_issued":
        "Issued certificate {{names}} for tenant {{slug}}",
      "platform.audit.tenant_suspended": "Suspended tenant {{slug}}",
      "platform.audit.tenant_resumed": "Resumed tenant {{slug}}",
      "platform.audit.tenant_archived": "Archived tenant {{slug}}",
      "platform.audit.tenant_admin_password_reset":
        "Reset password for tenant admin {{admin}}",
      "platform.audit.tenant_impersonated":
        "Impersonated tenant {{slug}} as {{admin}}",
      "platform.audit.tenant_features_updated":
        "Updated feature flags for tenant {{slug}}",
      "platform.audit.tenant_entitlements_updated":
        "Updated entitlements for tenant {{slug}}",
      "platform.audit.tenant_appearance_updated":
        "Updated appearance for tenant {{slug}}",
      "platform.audit.tenant_plan_updated": "Updated plan for tenant {{slug}}",
      "platform.audit.tenant_registered":
        "Registered tenant {{tenant_name}} ({{tenant_slug}})",
      "platform.audit.user_joined_default":
        "User self-registered into default tenant {{tenant_slug}}",
      "platform.audit.settings_updated": "Updated platform settings",
      "platform.audit.openai_updated": "Updated AI API configuration",
      "platform.audit.plan_limit_templates_updated":
        "Updated plan limit templates",
      "platform.audit.background_job_cancelled":
        "Cancelled background job {{job}}",
      "platform.audit.background_job_cancelled_not_running":
        "Cancelled background job {{job}} (not running)",
      "platform.audit.database_backed_up": "Created backup: {{filename}}",
      "platform.audit.database_restored": "Restored from backup: {{filename}}",
      "platform.audit.role_created":
        "Created platform role {{name}} with permissions: {{permissions_text}}",
      "platform.audit.role_updated": "Updated platform role {{name}}",
      "platform.audit.role_updated_with_permissions":
        "Updated platform role {{name}} with permissions: {{permissions_text}}",
      "platform.audit.role_deleted": "Deleted platform role {{name}}",
      "platform.audit.admin_created": "Created platform admin {{username}}",
      "platform.audit.admin_updated": "Updated platform admin {{username}}",
      "platform.audit.admin_deleted": "Deleted platform admin {{username}}",
      "platform.audit.admin_password_reset":
        "Reset password for platform admin {{username}}",
      "platform.audit.admin_roles_updated":
        "Updated roles for platform admin {{username}}: {{roles_text}}",
    },
  },
};
