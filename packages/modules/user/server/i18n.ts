import type { ServerI18nBundle } from "@be-water/server-kernel/runtime/module-contract.js";

export const USER_SERVER_I18N: ServerI18nBundle = {
  id: "user",
  messages: {
    "zh-CN": {
      "user.audit.created": "创建用户 {{username}}",
      "user.audit.updated": "更新用户 {{username}}",
      "user.audit.deleted": "删除用户 {{username}}",
      "user.audit.password_reset": "重置用户 {{username}} 的密码",
      "user.audit.batch_deleted": "删除用户 {{usernames}}",
    },
    en: {
      "user.audit.created": "Created user {{username}}",
      "user.audit.updated": "Updated user {{username}}",
      "user.audit.deleted": "Deleted user {{username}}",
      "user.audit.password_reset": "Reset password for user {{username}}",
      "user.audit.batch_deleted": "Deleted users {{usernames}}",
    },
  },
};
