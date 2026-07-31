import type { AppLocale } from "@be-water/shared";

/**
 * 服务端消息包：按 **稳定 code** 索引（如 `notes.not_found`），
 * 支持 `{{param}}` 插值。由 kernel 与各模块 `server.i18n` 贡献，组装时合并。
 */
export interface ServerI18nBundle {
  /** 仅文档/调试；实际以 messages 内的 code 为准。 */
  id?: string;
  messages: Partial<Record<AppLocale, Record<string, string>>>;
}

export interface TranslateMessageInput {
  code?: string;
  /** 默认语言（zh-CN）原文；无 code 或目录未命中时使用。 */
  message?: string;
  params?: Record<string, unknown>;
}
