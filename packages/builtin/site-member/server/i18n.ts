import type { ServerI18nBundle } from "@be-water/server-kernel/runtime/module-contract.js";

/**
 * 会员可见文案属于「站点公开面」：不得出现「租户」「Tenant」，
 * 统一用「站点 / site」表述（见 tenancy-mode rule）。
 */
export const SITE_MEMBER_SERVER_I18N: ServerI18nBundle = {
  id: "site-member",
  messages: {
    "zh-CN": {
      "site_member.site_unbound": "该地址未绑定任何站点",
      "site_member.site_unavailable": "站点当前不可用",
      "site_member.not_enabled": "该站点未开通会员功能",
      "site_member.member_required": "请先登录会员账户",
      "site_member.not_found": "会员不存在",
      "site_member.email_required": "请填写邮箱",
      "site_member.email_invalid": "邮箱格式不正确",
      "site_member.email_exists": "该邮箱已注册",
      "site_member.password_required": "请填写密码",
      "site_member.password_min_8": "密码至少 8 位",
      "site_member.password_not_set": "该账户未设置密码",
      "site_member.credentials_required": "请填写邮箱与密码",
      "site_member.invalid_credentials": "邮箱或密码不正确",
      "site_member.old_password_incorrect": "原密码不正确",
      "site_member.account_disabled": "该账户已被停用",
      "site_member.account_locked_retry": "登录失败过多，请 30 分钟后重试",
      "site_member.display_name_required": "昵称不能为空",
      "site_member.display_name_too_long": "昵称最长 50 个字符",
      "site_member.token_invalid_type": "登录凭证类型不正确",
      "site_member.token_invalid_or_expired": "登录已过期，请重新登录",
      "site_member.oauth_provider_invalid": "不支持的第三方登录方式",
      "site_member.oauth_email_required": "第三方账号未提供可用邮箱",
      "site_member.oauth_email_unverified": "请使用已验证邮箱的第三方账号",
      "site_member.oauth_exchange_invalid": "登录凭证无效或已过期，请重试",
      "site_member.oauth_tenant_mismatch": "账号与当前站点不匹配",
      "site_member.form_origin_invalid": "请求来源不合法，请从本站页面提交",
      "site_member.password_mismatch": "两次输入的新密码不一致",
      "site_member.audit.registered": "会员注册：{{email}}",
      "site_member.audit.oauth_registered":
        "会员通过 {{provider}} 注册：{{email}}",
      "site_member.audit.password_changed": "会员修改密码：{{email}}",
      "site_member.audit.updated": "更新会员：{{email}}",
      "site_member.audit.deleted": "删除会员：{{email}}",
      "site_member.audit.password_reset": "重置会员密码：{{email}}",
    },
    en: {
      "site_member.site_unbound": "No site is bound to this address",
      "site_member.site_unavailable": "This site is currently unavailable",
      "site_member.not_enabled": "Memberships are not enabled for this site",
      "site_member.member_required": "Please sign in to your account first",
      "site_member.not_found": "Member not found",
      "site_member.email_required": "Email is required",
      "site_member.email_invalid": "Email format is invalid",
      "site_member.email_exists": "This email is already registered",
      "site_member.password_required": "Password is required",
      "site_member.password_min_8": "Password must be at least 8 characters",
      "site_member.password_not_set": "This account has no password set",
      "site_member.credentials_required": "Email and password are required",
      "site_member.invalid_credentials": "Incorrect email or password",
      "site_member.old_password_incorrect": "Current password is incorrect",
      "site_member.account_disabled": "This account has been disabled",
      "site_member.account_locked_retry":
        "Too many failed attempts, please retry in 30 minutes",
      "site_member.display_name_required": "Display name is required",
      "site_member.display_name_too_long":
        "Display name must be at most 50 characters",
      "site_member.token_invalid_type": "Invalid credential type",
      "site_member.token_invalid_or_expired":
        "Your session has expired, please sign in again",
      "site_member.oauth_provider_invalid": "Unsupported sign-in provider",
      "site_member.oauth_email_required":
        "The third-party account did not provide an email",
      "site_member.oauth_email_unverified":
        "Please use a third-party account with a verified email",
      "site_member.oauth_exchange_invalid":
        "Sign-in code is invalid or expired, please try again",
      "site_member.oauth_tenant_mismatch":
        "This account does not belong to the current site",
      "site_member.form_origin_invalid":
        "Invalid request origin — please submit from this site",
      "site_member.password_mismatch": "The two new passwords do not match",
      "site_member.audit.registered": "Member registered: {{email}}",
      "site_member.audit.oauth_registered":
        "Member registered via {{provider}}: {{email}}",
      "site_member.audit.password_changed": "Member changed password: {{email}}",
      "site_member.audit.updated": "Updated member: {{email}}",
      "site_member.audit.deleted": "Deleted member: {{email}}",
      "site_member.audit.password_reset": "Reset member password: {{email}}",
    },
  },
};
