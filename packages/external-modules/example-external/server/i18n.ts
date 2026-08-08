import type { ServerI18nBundle } from "@be-water/module-sdk/server";

export const EXAMPLE_EXTERNAL_SERVER_I18N: ServerI18nBundle = {
  id: "example-external",
  messages: {
    "zh-CN": {
      "example-external.not_found": "书签不存在",
      "example-external.url_required": "URL 不能为空",
      "example-external.title_required": "标题不能为空",
      "example-external.audit.created": "创建书签：{{title}}",
      "example-external.audit.updated": "更新书签：{{title}}",
      "example-external.audit.deleted": "删除书签：{{title}}",
    },
    en: {
      "example-external.not_found": "Bookmark not found",
      "example-external.url_required": "URL is required",
      "example-external.title_required": "Title is required",
      "example-external.audit.created": "Created bookmark: {{title}}",
      "example-external.audit.updated": "Updated bookmark: {{title}}",
      "example-external.audit.deleted": "Deleted bookmark: {{title}}",
    },
  },
};
