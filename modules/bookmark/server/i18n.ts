import type { ServerI18nBundle } from "@be-water/module-sdk/server";

export const BOOKMARK_SERVER_I18N: ServerI18nBundle = {
  id: "bookmark",
  messages: {
    "zh-CN": {
      "bookmark.not_found": "书签不存在",
      "bookmark.url_required": "URL 不能为空",
      "bookmark.title_required": "标题不能为空",
      "bookmark.audit.created": "创建书签：{{title}}",
      "bookmark.audit.updated": "更新书签：{{title}}",
      "bookmark.audit.deleted": "删除书签：{{title}}",
    },
    en: {
      "bookmark.not_found": "Bookmark not found",
      "bookmark.url_required": "URL is required",
      "bookmark.title_required": "Title is required",
      "bookmark.audit.created": "Created bookmark: {{title}}",
      "bookmark.audit.updated": "Updated bookmark: {{title}}",
      "bookmark.audit.deleted": "Deleted bookmark: {{title}}",
    },
  },
};
