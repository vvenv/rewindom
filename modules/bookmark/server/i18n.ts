import type { ServerI18nBundle } from "@be-water/module-sdk/server";

export const BOOKMARK_SERVER_I18N: ServerI18nBundle = {
  id: "bookmark",
  messages: {
    "zh-CN": {
      "bookmark.not_found": "书签不存在",
      "bookmark.url_required": "URL 不能为空",
      "bookmark.url_invalid": "请填写有效的 http/https 链接",
      "bookmark.url_too_long": "URL 不能超过 {{max}} 个字符",
      "bookmark.title_required": "标题不能为空",
      "bookmark.title_too_long": "标题不能超过 {{max}} 个字符",
      "bookmark.description_too_long": "描述不能超过 {{max}} 个字符",
      "bookmark.audit.created": "创建书签：{{title}}",
      "bookmark.audit.updated": "更新书签：{{title}}",
      "bookmark.audit.deleted": "删除书签：{{title}}",
    },
    en: {
      "bookmark.not_found": "Bookmark not found",
      "bookmark.url_required": "URL is required",
      "bookmark.url_invalid": "Enter a valid http/https link",
      "bookmark.url_too_long": "URL must be at most {{max}} characters",
      "bookmark.title_required": "Title is required",
      "bookmark.title_too_long": "Title must be at most {{max}} characters",
      "bookmark.description_too_long":
        "Description must be at most {{max}} characters",
      "bookmark.audit.created": "Created bookmark: {{title}}",
      "bookmark.audit.updated": "Updated bookmark: {{title}}",
      "bookmark.audit.deleted": "Deleted bookmark: {{title}}",
    },
  },
};
