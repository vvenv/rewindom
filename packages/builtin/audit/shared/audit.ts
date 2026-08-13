import { TENANT_IMPERSONATION_USERNAME } from "@rewindom/shared";

export const AuditAction = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  REGISTER: "REGISTER",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DELETE: "USER_DELETE",
  PASSWORD_RESET: "PASSWORD_RESET",
  UPDATE_USER_PERMISSIONS: "UPDATE_USER_PERMISSIONS",
  ROLE_CREATE: "ROLE_CREATE",
  ROLE_UPDATE: "ROLE_UPDATE",
  ROLE_DELETE: "ROLE_DELETE",
  BACKUP_DATABASE: "BACKUP_DATABASE",
  RESTORE_DATABASE: "RESTORE_DATABASE",
  TENANT_FEATURES_UPDATE: "TENANT_FEATURES_UPDATE",
  TENANT_MODULES_UPDATE: "TENANT_MODULES_UPDATE",
  TENANT_ENTITLEMENTS_UPDATE: "TENANT_ENTITLEMENTS_UPDATE",
  TENANT_APPEARANCE_UPDATE: "TENANT_APPEARANCE_UPDATE",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
  TENANT_CREATE: "TENANT_CREATE",
  TENANT_UPDATE: "TENANT_UPDATE",
  TENANT_SUSPEND: "TENANT_SUSPEND",
  TENANT_RESUME: "TENANT_RESUME",
  TENANT_ADMIN_PASSWORD_RESET: "TENANT_ADMIN_PASSWORD_RESET",
  TENANT_ARCHIVE: "TENANT_ARCHIVE",
  TENANT_IMPERSONATE: "TENANT_IMPERSONATE",
  TENANT_REGISTER: "TENANT_REGISTER",
  PLAN_CHANGE_ADMIN: "PLAN_CHANGE_ADMIN",
  PLAN_LIMIT_TEMPLATES_UPDATE: "PLAN_LIMIT_TEMPLATES_UPDATE",
  PLATFORM_SETTINGS_UPDATE: "PLATFORM_SETTINGS_UPDATE",
  TENANT_API_KEY_CREATE: "TENANT_API_KEY_CREATE",
  TENANT_API_KEY_REVOKE: "TENANT_API_KEY_REVOKE",
  ERROR_LOG_DELETE: "ERROR_LOG_DELETE",
  ERROR_LOG_CLEANUP: "ERROR_LOG_CLEANUP",
  BACKGROUND_JOB_CANCEL: "BACKGROUND_JOB_CANCEL",
  NOTE_CREATE: "NOTE_CREATE",
  NOTE_UPDATE: "NOTE_UPDATE",
  NOTE_DELETE: "NOTE_DELETE",
  SITE_UPDATE: "SITE_UPDATE",
  SITE_PAGE_CREATE: "SITE_PAGE_CREATE",
  SITE_PAGE_UPDATE: "SITE_PAGE_UPDATE",
  SITE_PAGE_DELETE: "SITE_PAGE_DELETE",
  SITE_PAGE_PUBLISH: "SITE_PAGE_PUBLISH",
  SITE_PAGE_UNPUBLISH: "SITE_PAGE_UNPUBLISH",
  SITE_FORM_SUBMISSION_DELETE: "SITE_FORM_SUBMISSION_DELETE",
  SITE_REDIRECT_SAVE: "SITE_REDIRECT_SAVE",
  SITE_REDIRECT_DELETE: "SITE_REDIRECT_DELETE",
  SITE_ASSET_DELETE: "SITE_ASSET_DELETE",
  SITE_PAGE_VERSION_RESTORE: "SITE_PAGE_VERSION_RESTORE",
  SITE_DOC_CREATE: "SITE_DOC_CREATE",
  SITE_DOC_UPDATE: "SITE_DOC_UPDATE",
  SITE_DOC_DELETE: "SITE_DOC_DELETE",
  SITE_DOC_PUBLISH: "SITE_DOC_PUBLISH",
  SITE_DOC_UNPUBLISH: "SITE_DOC_UNPUBLISH",
  SITE_DOC_IMPORT: "SITE_DOC_IMPORT",
  SITE_DOC_CATEGORY_CREATE: "SITE_DOC_CATEGORY_CREATE",
  SITE_DOC_CATEGORY_UPDATE: "SITE_DOC_CATEGORY_UPDATE",
  SITE_DOC_CATEGORY_DELETE: "SITE_DOC_CATEGORY_DELETE",
  SITE_MEMBER_REGISTER: "SITE_MEMBER_REGISTER",
  SITE_MEMBER_UPDATE: "SITE_MEMBER_UPDATE",
  SITE_MEMBER_DELETE: "SITE_MEMBER_DELETE",
  SITE_MEMBER_PASSWORD_RESET: "SITE_MEMBER_PASSWORD_RESET",
  SITE_MEMBER_OAUTH_UPDATE: "SITE_MEMBER_OAUTH_UPDATE",
  TODO_CREATE: "TODO_CREATE",
  TODO_UPDATE: "TODO_UPDATE",
  TODO_DELETE: "TODO_DELETE",
  TODO_CLEAR_COMPLETED: "TODO_CLEAR_COMPLETED",
  TODO_TOGGLE_ALL: "TODO_TOGGLE_ALL",
  BILLING_CHECKOUT_CREATE: "BILLING_CHECKOUT_CREATE",
  BILLING_SUBSCRIPTION_CANCEL: "BILLING_SUBSCRIPTION_CANCEL",
  BILLING_WEBHOOK_SYNC: "BILLING_WEBHOOK_SYNC",
  SITE_BILLING_PLAN_CREATE: "SITE_BILLING_PLAN_CREATE",
  SITE_BILLING_PLAN_UPDATE: "SITE_BILLING_PLAN_UPDATE",
  SITE_BILLING_PLAN_DELETE: "SITE_BILLING_PLAN_DELETE",
  SITE_BILLING_PROVIDER_UPDATE: "SITE_BILLING_PROVIDER_UPDATE",
  SITE_BILLING_WEBHOOK_SYNC: "SITE_BILLING_WEBHOOK_SYNC",
  PLAN_PRICING_UPDATE: "PLAN_PRICING_UPDATE",
  SHOP_PRODUCT_CREATE: "SHOP_PRODUCT_CREATE",
  SHOP_PRODUCT_UPDATE: "SHOP_PRODUCT_UPDATE",
  SHOP_PRODUCT_DELETE: "SHOP_PRODUCT_DELETE",
  SHOP_COLLECTION_CREATE: "SHOP_COLLECTION_CREATE",
  SHOP_COLLECTION_UPDATE: "SHOP_COLLECTION_UPDATE",
  SHOP_COLLECTION_DELETE: "SHOP_COLLECTION_DELETE",
  SHOP_DISCOUNT_CREATE: "SHOP_DISCOUNT_CREATE",
  SHOP_DISCOUNT_UPDATE: "SHOP_DISCOUNT_UPDATE",
  SHOP_DISCOUNT_DELETE: "SHOP_DISCOUNT_DELETE",
  SHOP_ORDER_FULFILL: "SHOP_ORDER_FULFILL",
  SHOP_ORDER_REFUND: "SHOP_ORDER_REFUND",
  SHOP_SHIPPING_SAVE: "SHOP_SHIPPING_SAVE",
  SHOP_SETTING_UPDATE: "SHOP_SETTING_UPDATE",
  SHOP_PROVIDER_UPDATE: "SHOP_PROVIDER_UPDATE",
  SHOP_WEBHOOK_SYNC: "SHOP_WEBHOOK_SYNC",
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

/** Who can read the audit row: tenant console vs platform console. */
export const AuditScope = {
  TENANT: "tenant",
  PLATFORM: "platform",
} as const;

export type AuditScopeType = (typeof AuditScope)[keyof typeof AuditScope];

/** Platform-console actions and impersonation sessions — hidden from tenant audit UI. */
export const PLATFORM_ONLY_AUDIT_ACTIONS = new Set<AuditActionType>([
  AuditAction.TENANT_CREATE,
  AuditAction.TENANT_UPDATE,
  AuditAction.TENANT_SUSPEND,
  AuditAction.TENANT_RESUME,
  AuditAction.TENANT_ARCHIVE,
  AuditAction.TENANT_ADMIN_PASSWORD_RESET,
  AuditAction.TENANT_IMPERSONATE,
  AuditAction.TENANT_FEATURES_UPDATE,
  AuditAction.TENANT_MODULES_UPDATE,
  AuditAction.TENANT_ENTITLEMENTS_UPDATE,
  AuditAction.TENANT_APPEARANCE_UPDATE,
  AuditAction.BACKUP_DATABASE,
  AuditAction.RESTORE_DATABASE,
  AuditAction.PLAN_CHANGE_ADMIN,
  AuditAction.PLAN_LIMIT_TEMPLATES_UPDATE,
  AuditAction.PLATFORM_SETTINGS_UPDATE,
]);

export function isPlatformOnlyAuditAction(action: string): boolean {
  return PLATFORM_ONLY_AUDIT_ACTIONS.has(action as AuditActionType);
}

export function resolveAuditLogScope(input: {
  scope?: AuditScopeType;
  action: AuditActionType | string;
  username: string;
  /** 无租户归属（平台管理员会话等）时归入 platform，避免泄漏到租户端。 */
  tenant_slug?: string | null;
}): AuditScopeType {
  if (input.scope) {
    return input.scope;
  }
  if (isPlatformOnlyAuditAction(input.action)) {
    return AuditScope.PLATFORM;
  }
  if (input.username === TENANT_IMPERSONATION_USERNAME) {
    return AuditScope.PLATFORM;
  }
  // 没有 tenant_slug 的行不属于任何租户；默认归 platform，
  // 防止平台管理员 LOGIN 等被 default 租户的历史兼容规则捞走。
  if (input.tenant_slug == null || input.tenant_slug === "") {
    return AuditScope.PLATFORM;
  }
  return AuditScope.TENANT;
}

export const AUDIT_ACTION_LABELS: Record<AuditActionType, string> = {
  [AuditAction.LOGIN]: "登录",
  [AuditAction.LOGOUT]: "登出",
  [AuditAction.REGISTER]: "注册",
  [AuditAction.PASSWORD_CHANGE]: "修改密码",
  [AuditAction.USER_CREATE]: "创建用户",
  [AuditAction.USER_UPDATE]: "更新用户",
  [AuditAction.USER_DELETE]: "删除用户",
  [AuditAction.PASSWORD_RESET]: "重置密码",
  [AuditAction.UPDATE_USER_PERMISSIONS]: "更新用户权限",
  [AuditAction.ROLE_CREATE]: "创建角色",
  [AuditAction.ROLE_UPDATE]: "更新角色",
  [AuditAction.ROLE_DELETE]: "删除角色",
  [AuditAction.BACKUP_DATABASE]: "备份数据库",
  [AuditAction.RESTORE_DATABASE]: "恢复数据库",
  [AuditAction.TENANT_FEATURES_UPDATE]: "更新租户功能开关",
  [AuditAction.TENANT_MODULES_UPDATE]: "更新租户模块开关",
  [AuditAction.TENANT_ENTITLEMENTS_UPDATE]: "更新租户模块与功能开关",
  [AuditAction.TENANT_APPEARANCE_UPDATE]: "更新租户默认主题",
  [AuditAction.SETTINGS_UPDATE]: "更新系统设置",
  [AuditAction.TENANT_CREATE]: "创建租户",
  [AuditAction.TENANT_UPDATE]: "更新租户",
  [AuditAction.TENANT_SUSPEND]: "暂停租户",
  [AuditAction.TENANT_RESUME]: "恢复租户",
  [AuditAction.TENANT_ADMIN_PASSWORD_RESET]: "重设租户管理员密码",
  [AuditAction.TENANT_ARCHIVE]: "归档租户",
  [AuditAction.TENANT_IMPERSONATE]: "代登录租户",
  [AuditAction.TENANT_REGISTER]: "自助注册租户",
  [AuditAction.PLAN_CHANGE_ADMIN]: "管理员变更套餐",
  [AuditAction.PLAN_LIMIT_TEMPLATES_UPDATE]: "更新套餐用量模板",
  [AuditAction.PLATFORM_SETTINGS_UPDATE]: "更新平台设置",
  [AuditAction.TENANT_API_KEY_CREATE]: "创建 API Key",
  [AuditAction.TENANT_API_KEY_REVOKE]: "吊销 API Key",
  [AuditAction.ERROR_LOG_DELETE]: "删除错误日志",
  [AuditAction.ERROR_LOG_CLEANUP]: "清理错误日志",
  [AuditAction.BACKGROUND_JOB_CANCEL]: "取消后台任务",
  [AuditAction.NOTE_CREATE]: "创建笔记",
  [AuditAction.NOTE_UPDATE]: "更新笔记",
  [AuditAction.NOTE_DELETE]: "删除笔记",
  [AuditAction.SITE_UPDATE]: "更新官网",
  [AuditAction.SITE_PAGE_CREATE]: "创建官网页面",
  [AuditAction.SITE_PAGE_UPDATE]: "更新官网页面",
  [AuditAction.SITE_PAGE_DELETE]: "删除官网页面",
  [AuditAction.SITE_PAGE_PUBLISH]: "发布官网页面",
  [AuditAction.SITE_PAGE_UNPUBLISH]: "取消发布官网页面",
  [AuditAction.SITE_FORM_SUBMISSION_DELETE]: "删除官网表单提交",
  [AuditAction.SITE_REDIRECT_SAVE]: "保存官网重定向",
  [AuditAction.SITE_REDIRECT_DELETE]: "删除官网重定向",
  [AuditAction.SITE_ASSET_DELETE]: "删除官网媒体",
  [AuditAction.SITE_PAGE_VERSION_RESTORE]: "恢复官网页面历史版本",
  [AuditAction.SITE_DOC_CREATE]: "创建文档",
  [AuditAction.SITE_DOC_UPDATE]: "更新文档",
  [AuditAction.SITE_DOC_DELETE]: "删除文档",
  [AuditAction.SITE_DOC_PUBLISH]: "发布文档",
  [AuditAction.SITE_DOC_UNPUBLISH]: "取消发布文档",
  [AuditAction.SITE_DOC_IMPORT]: "导入文档",
  [AuditAction.SITE_DOC_CATEGORY_CREATE]: "创建文档分类",
  [AuditAction.SITE_DOC_CATEGORY_UPDATE]: "更新文档分类",
  [AuditAction.SITE_DOC_CATEGORY_DELETE]: "删除文档分类",
  [AuditAction.SITE_MEMBER_REGISTER]: "会员注册",
  [AuditAction.SITE_MEMBER_UPDATE]: "更新会员",
  [AuditAction.SITE_MEMBER_DELETE]: "删除会员",
  [AuditAction.SITE_MEMBER_PASSWORD_RESET]: "重置会员密码",
  [AuditAction.SITE_MEMBER_OAUTH_UPDATE]: "更新会员第三方登录",
  [AuditAction.TODO_CREATE]: "创建待办",
  [AuditAction.TODO_UPDATE]: "更新待办",
  [AuditAction.TODO_DELETE]: "删除待办",
  [AuditAction.TODO_CLEAR_COMPLETED]: "清除已完成待办",
  [AuditAction.TODO_TOGGLE_ALL]: "批量切换待办完成态",
  [AuditAction.BILLING_CHECKOUT_CREATE]: "创建付款结账",
  [AuditAction.BILLING_SUBSCRIPTION_CANCEL]: "取消订阅",
  [AuditAction.BILLING_WEBHOOK_SYNC]: "同步付款 webhook",
  [AuditAction.SITE_BILLING_PLAN_CREATE]: "新建会员套餐",
  [AuditAction.SITE_BILLING_PLAN_UPDATE]: "修改会员套餐",
  [AuditAction.SITE_BILLING_PLAN_DELETE]: "删除会员套餐",
  [AuditAction.SITE_BILLING_PROVIDER_UPDATE]: "更新会员收款通道",
  [AuditAction.SITE_BILLING_WEBHOOK_SYNC]: "同步会员付费 webhook",
  [AuditAction.PLAN_PRICING_UPDATE]: "更新套餐定价配置",
  [AuditAction.SHOP_PRODUCT_CREATE]: "创建商品",
  [AuditAction.SHOP_PRODUCT_UPDATE]: "更新商品",
  [AuditAction.SHOP_PRODUCT_DELETE]: "删除商品",
  [AuditAction.SHOP_COLLECTION_CREATE]: "创建分类",
  [AuditAction.SHOP_COLLECTION_UPDATE]: "更新分类",
  [AuditAction.SHOP_COLLECTION_DELETE]: "删除分类",
  [AuditAction.SHOP_DISCOUNT_CREATE]: "创建优惠码",
  [AuditAction.SHOP_DISCOUNT_UPDATE]: "更新优惠码",
  [AuditAction.SHOP_DISCOUNT_DELETE]: "删除优惠码",
  [AuditAction.SHOP_ORDER_FULFILL]: "订单发货",
  [AuditAction.SHOP_ORDER_REFUND]: "订单退款",
  [AuditAction.SHOP_SHIPPING_SAVE]: "更新运费",
  [AuditAction.SHOP_SETTING_UPDATE]: "更新商店设置",
  [AuditAction.SHOP_PROVIDER_UPDATE]: "更新商店收款通道",
  [AuditAction.SHOP_WEBHOOK_SYNC]: "同步商店付款 webhook",
};

export const AUDIT_ACTION_GROUPS = [
  {
    label: "认证",
    actions: [
      AuditAction.LOGIN,
      AuditAction.LOGOUT,
      AuditAction.REGISTER,
      AuditAction.PASSWORD_CHANGE,
      AuditAction.PASSWORD_RESET,
    ],
  },
  {
    label: "用户管理",
    actions: [
      AuditAction.USER_CREATE,
      AuditAction.USER_UPDATE,
      AuditAction.USER_DELETE,
      AuditAction.UPDATE_USER_PERMISSIONS,
      AuditAction.ROLE_CREATE,
      AuditAction.ROLE_UPDATE,
      AuditAction.ROLE_DELETE,
    ],
  },
  {
    label: "系统",
    actions: [
      AuditAction.BACKUP_DATABASE,
      AuditAction.RESTORE_DATABASE,
      AuditAction.TENANT_FEATURES_UPDATE,
      AuditAction.TENANT_MODULES_UPDATE,
      AuditAction.TENANT_ENTITLEMENTS_UPDATE,
      AuditAction.TENANT_APPEARANCE_UPDATE,
      AuditAction.SETTINGS_UPDATE,
      AuditAction.TENANT_API_KEY_CREATE,
      AuditAction.TENANT_API_KEY_REVOKE,
      AuditAction.TENANT_REGISTER,
      AuditAction.PLAN_CHANGE_ADMIN,
      AuditAction.PLATFORM_SETTINGS_UPDATE,
      AuditAction.ERROR_LOG_DELETE,
      AuditAction.ERROR_LOG_CLEANUP,
      AuditAction.BACKGROUND_JOB_CANCEL,
    ],
  },
  {
    label: "示例模块",
    actions: [
      AuditAction.NOTE_CREATE,
      AuditAction.NOTE_UPDATE,
      AuditAction.NOTE_DELETE,
    ],
  },
  {
    label: "官网",
    actions: [
      AuditAction.SITE_UPDATE,
      AuditAction.SITE_PAGE_CREATE,
      AuditAction.SITE_PAGE_UPDATE,
      AuditAction.SITE_PAGE_DELETE,
      AuditAction.SITE_PAGE_PUBLISH,
      AuditAction.SITE_PAGE_UNPUBLISH,
      AuditAction.SITE_FORM_SUBMISSION_DELETE,
      AuditAction.SITE_REDIRECT_SAVE,
      AuditAction.SITE_REDIRECT_DELETE,
      AuditAction.SITE_ASSET_DELETE,
      AuditAction.SITE_PAGE_VERSION_RESTORE,
      AuditAction.SITE_DOC_CREATE,
      AuditAction.SITE_DOC_UPDATE,
      AuditAction.SITE_DOC_DELETE,
      AuditAction.SITE_DOC_PUBLISH,
      AuditAction.SITE_DOC_UNPUBLISH,
      AuditAction.SITE_DOC_IMPORT,
      AuditAction.SITE_DOC_CATEGORY_CREATE,
      AuditAction.SITE_DOC_CATEGORY_UPDATE,
      AuditAction.SITE_DOC_CATEGORY_DELETE,
    ],
  },
  {
    label: "站点会员",
    actions: [
      AuditAction.SITE_MEMBER_REGISTER,
      AuditAction.SITE_MEMBER_UPDATE,
      AuditAction.SITE_MEMBER_DELETE,
      AuditAction.SITE_MEMBER_PASSWORD_RESET,
      AuditAction.SITE_MEMBER_OAUTH_UPDATE,
    ],
  },
  {
    label: "Todos",
    actions: [
      AuditAction.TODO_CREATE,
      AuditAction.TODO_UPDATE,
      AuditAction.TODO_DELETE,
      AuditAction.TODO_CLEAR_COMPLETED,
      AuditAction.TODO_TOGGLE_ALL,
    ],
  },
  {
    label: "订阅与付款",
    actions: [
      AuditAction.BILLING_CHECKOUT_CREATE,
      AuditAction.BILLING_SUBSCRIPTION_CANCEL,
      AuditAction.BILLING_WEBHOOK_SYNC,
    ],
  },
  {
    label: "会员付费",
    actions: [
      AuditAction.SITE_BILLING_PLAN_CREATE,
      AuditAction.SITE_BILLING_PLAN_UPDATE,
      AuditAction.SITE_BILLING_PLAN_DELETE,
      AuditAction.SITE_BILLING_PROVIDER_UPDATE,
      AuditAction.SITE_BILLING_WEBHOOK_SYNC,
    ],
  },
  {
    label: "套餐配置",
    actions: [AuditAction.PLAN_PRICING_UPDATE],
  },
  {
    label: "商店",
    actions: [
      AuditAction.SHOP_PRODUCT_CREATE,
      AuditAction.SHOP_PRODUCT_UPDATE,
      AuditAction.SHOP_PRODUCT_DELETE,
      AuditAction.SHOP_COLLECTION_CREATE,
      AuditAction.SHOP_COLLECTION_UPDATE,
      AuditAction.SHOP_COLLECTION_DELETE,
      AuditAction.SHOP_DISCOUNT_CREATE,
      AuditAction.SHOP_DISCOUNT_UPDATE,
      AuditAction.SHOP_DISCOUNT_DELETE,
      AuditAction.SHOP_ORDER_FULFILL,
      AuditAction.SHOP_ORDER_REFUND,
      AuditAction.SHOP_SHIPPING_SAVE,
      AuditAction.SHOP_SETTING_UPDATE,
      AuditAction.SHOP_PROVIDER_UPDATE,
      AuditAction.SHOP_WEBHOOK_SYNC,
    ],
  },
] as const;

export interface AuditLog {
  id: string;
  user_id: string | null;
  username: string;
  /** 租户侧接口不下发该字段（同租户下恒等，且没必要外泄）；平台侧必返回。 */
  tenant_slug?: string | null;
  /** 平台侧列表按 slug 回填的租户名称。 */
  tenant_name?: string | null;
  action: string;
  resource: string | null;
  /** 遗留纯文本或 zh-CN 检索副本 */
  details: string | null;
  /** 稳定模板 code；有值时前端按当前语言渲染 */
  detail_key: string | null;
  detail_params: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/** Cross-tenant audit row for the platform console. */
export interface PlatformAuditLog extends AuditLog {
  tenant_slug: string | null;
  tenant_name: string | null;
}
