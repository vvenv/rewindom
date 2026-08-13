import type { ServerI18nBundle } from "@rewindom/server-kernel/runtime/module-contract.js";

export const RBAC_SERVER_I18N: ServerI18nBundle = {
  id: "rbac",
  messages: {
    "zh-CN": {
      "rbac.audit.role_created":
        "创建角色 {{name}}，权限：{{permissions_text}}",
      "rbac.audit.role_updated": "更新角色 {{name}}",
      "rbac.audit.role_updated_with_permissions":
        "更新角色 {{name}}，权限：{{permissions_text}}",
      "rbac.audit.role_deleted": "删除角色 {{name}}",
      "rbac.audit.user_roles_updated":
        "更新用户 {{username}} 的角色：{{roles_text}}",
    },
    en: {
      "rbac.audit.role_created":
        "Created role {{name}} with permissions: {{permissions_text}}",
      "rbac.audit.role_updated": "Updated role {{name}}",
      "rbac.audit.role_updated_with_permissions":
        "Updated role {{name}} with permissions: {{permissions_text}}",
      "rbac.audit.role_deleted": "Deleted role {{name}}",
      "rbac.audit.user_roles_updated":
        "Updated roles for {{username}}: {{roles_text}}",
    },
  },
};
