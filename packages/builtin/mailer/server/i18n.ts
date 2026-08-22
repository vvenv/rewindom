import type { ServerI18nBundle } from "@rewindom/server-kernel/runtime/module-contract.js";

export const MAILER_SERVER_I18N: ServerI18nBundle = {
  id: "mailer",
  messages: {
    "zh-CN": {
      "mailer.not_configured": "本站尚未配置发信通道",
      "mailer.not_enabled": "该组织未开通邮件发送",
      "mailer.send_failed": "邮件发送失败，请查看投递记录",
      "mailer.delivery_not_found": "投递记录不存在",
      "mailer.driver_invalid": "发信通道类型不支持",
      "mailer.driver_log_forbidden": "生产环境不允许使用「仅记录日志」通道",
      "mailer.smtp_port_invalid": "SMTP 端口不合法",
      "mailer.field_invalid": "发信配置字段不合法",
      "mailer.test_recipient_invalid": "请填写正确的收件地址",
      "mailer.audit.config_updated": "更新发信配置：{{driver}}（{{source}}）",
      "mailer.audit.test_sent": "发送测试邮件至 {{to}}",
      "mailer.audit.delivery_retried": "重试投递：{{status}}",
    },
    en: {
      "mailer.not_configured": "No mail transport configured for this site",
      "mailer.not_enabled": "Mail sending is not enabled for this organization",
      "mailer.send_failed": "Failed to send mail; check the delivery log",
      "mailer.delivery_not_found": "Delivery record not found",
      "mailer.driver_invalid": "Unsupported mail driver",
      "mailer.driver_log_forbidden":
        "The log-only driver cannot be used in production",
      "mailer.smtp_port_invalid": "Invalid SMTP port",
      "mailer.field_invalid": "Invalid mail configuration field",
      "mailer.test_recipient_invalid": "Enter a valid recipient address",
      "mailer.audit.config_updated":
        "Updated mail transport: {{driver}} ({{source}})",
      "mailer.audit.test_sent": "Sent a test email to {{to}}",
      "mailer.audit.delivery_retried": "Retried delivery: {{status}}",
    },
  },
};
