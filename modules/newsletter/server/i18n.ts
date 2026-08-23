import type { ServerI18nBundle } from "@rewindom/module-sdk/server";

export const NEWSLETTER_SERVER_I18N: ServerI18nBundle = {
  id: "newsletter",
  messages: {
    "zh-CN": {
      "newsletter.email_invalid": "请填写正确的邮箱地址",
      "newsletter.rate_limited": "提交太频繁，请稍后再试",
      "newsletter.mail_unavailable": "本站尚未配置发信通道，暂时无法订阅",
      "newsletter.site_origin_missing": "本站地址未配置，暂时无法发出确认邮件",
      "newsletter.list_unknown": "订阅列表不存在",
      "newsletter.no_lists": "本站暂时没有可订阅的内容",
      "newsletter.subscriber_not_found": "订阅者不存在",
      "newsletter.link.subscribe": "邮件订阅",
      /*
       * 订阅段表单下面那一行：读者在这里没有任何可选项——**周期是租户在段上定的**，
       * 范围可能是从主题页带过来的。两件事都只能靠这一行告诉他。
       */
      "newsletter.scope.line": "订阅范围：{{list}}",
      "newsletter.scope.all": "本站全部更新",
      "newsletter.cadence.daily": "每天一封摘要",
      "newsletter.cadence.weekly": "每周一封摘要",
      "newsletter.link.jumpToSection": "跳过去并定位到订阅区块",
      "newsletter.link.samePage": "同一页内滚动到订阅区块",
      "newsletter.reactivate_complained":
        "这个地址举报过垃圾邮件，不能一键恢复",
      "newsletter.suppressed.hard_bounce": "地址不存在（永久退信）",
      "newsletter.suppressed.soft_bounce": "连续退信，已暂停发送",
      "newsletter.suppressed.complaint": "被举报为垃圾邮件",
      "newsletter.audit.reactivated": "恢复订阅者发送",
      "newsletter.audit.deleted": "删除订阅者：{{email}}",
      "newsletter.audit.exported": "导出订阅者名单",
      "newsletter.audit.digest_run": "手动触发摘要投递：{{sent}} 组",
    },
    en: {
      "newsletter.email_invalid": "Enter a valid email address",
      "newsletter.rate_limited": "Too many attempts; try again later",
      "newsletter.mail_unavailable":
        "This site has no mail transport configured yet",
      "newsletter.site_origin_missing":
        "This site has no address configured, so confirmation email cannot be sent",
      "newsletter.list_unknown": "Unknown subscription list",
      "newsletter.no_lists": "Nothing to subscribe to on this site yet",
      "newsletter.subscriber_not_found": "Subscriber not found",
      "newsletter.link.subscribe": "Newsletter signup",
      "newsletter.scope.line": "Subscribing to {{list}}",
      "newsletter.scope.all": "everything on this site",
      "newsletter.cadence.daily": "A digest every day",
      "newsletter.cadence.weekly": "A digest every week",
      "newsletter.link.jumpToSection": "Jump to the signup section",
      "newsletter.link.samePage": "Scroll to the signup section on this page",
      "newsletter.reactivate_complained":
        "This address reported spam and cannot be reactivated with one click",
      "newsletter.suppressed.hard_bounce":
        "Address does not exist (hard bounce)",
      "newsletter.suppressed.soft_bounce": "Repeated bounces; sending paused",
      "newsletter.suppressed.complaint": "Reported as spam",
      "newsletter.audit.reactivated": "Reactivated subscriber",
      "newsletter.audit.deleted": "Deleted subscriber: {{email}}",
      "newsletter.audit.exported": "Exported subscriber list",
      "newsletter.audit.digest_run": "Ran digests manually: {{sent}} group(s)",
    },
  },
};
