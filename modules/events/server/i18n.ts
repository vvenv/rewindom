import type { ServerI18nBundle } from "@rewindom/module-sdk/server";

/**
 * API 错误与审计模板文案，按稳定 code 提供。
 * 租户侧文案不出现「租户」「Tenant」（见 tenancy-mode rule）。
 */
export const EVENTS_SERVER_I18N: ServerI18nBundle = {
  id: "events",
  messages: {
    "zh-CN": {
      "events.not_found": "事件不存在或已被清理",
      "events.feed_not_found": "采集源不存在",
      "events.feed_url_taken": "这个地址已经添加过了",
      "events.feed_name_required": "请填写来源名称",
      "events.feed_name_too_long": "来源名称不能超过 {{max}} 个字符",
      "events.feed_url_required": "请填写订阅地址",
      "events.feed_url_invalid": "请填写有效的 http(s) 地址",
      "events.feed_connector_invalid": "不支持的采集方式",
      "events.feed_source_kind_invalid": "请选择来源类型",
      "events.feed_topic_invalid": "请选择主题",
      "events.title_required": "请填写标题",
      "events.title_too_long": "标题不能超过 {{max}} 个字符",
      "events.summary_too_long": "摘要不能超过 {{max}} 个字符",
      "events.topic_invalid": "请选择主题",
      "events.update_empty": "没有要保存的更改",
      "events.audit.followed": "关注事件：{{event}}",
      "events.audit.unfollowed": "取消关注事件：{{event}}",
      "events.audit.updated": "编辑事件：{{event}}",
      "events.audit.feed_created": "新增采集源：{{name}}",
      "events.audit.feed_updated": "更新采集源：{{name}}",
      "events.audit.feed_deleted": "删除采集源：{{name}}",
    },
    en: {
      "events.not_found": "Event not found or already pruned",
      "events.feed_not_found": "Source not found",
      "events.feed_url_taken": "This feed URL is already added",
      "events.feed_name_required": "Enter a source name",
      "events.feed_name_too_long": "Source name cannot exceed {{max}} characters",
      "events.feed_url_required": "Enter a feed URL",
      "events.feed_url_invalid": "Enter a valid http(s) URL",
      "events.feed_connector_invalid": "Unsupported connector",
      "events.feed_source_kind_invalid": "Choose a source kind",
      "events.feed_topic_invalid": "Choose a topic",
      "events.title_required": "Enter a title",
      "events.title_too_long": "Title cannot exceed {{max}} characters",
      "events.summary_too_long": "Summary cannot exceed {{max}} characters",
      "events.topic_invalid": "Choose a topic",
      "events.update_empty": "Nothing to save",
      "events.audit.followed": "Followed event: {{event}}",
      "events.audit.unfollowed": "Unfollowed event: {{event}}",
      "events.audit.updated": "Edited event: {{event}}",
      "events.audit.feed_created": "Added source: {{name}}",
      "events.audit.feed_updated": "Updated source: {{name}}",
      "events.audit.feed_deleted": "Deleted source: {{name}}",
    },
  },
};
