import type { ServerI18nBundle } from "@be-water/server-kernel/runtime/module-contract.js";

export const NOTES_SERVER_I18N: ServerI18nBundle = {
  id: "notes",
  messages: {
    "zh-CN": {
      "notes.not_found": "笔记不存在",
      "notes.title_required": "标题不能为空",
      "notes.audit.created": "创建笔记：{{title}}",
      "notes.audit.updated": "更新笔记：{{title}}",
      "notes.audit.deleted": "删除笔记：{{title}}",
    },
    en: {
      "notes.not_found": "Note not found",
      "notes.title_required": "Title is required",
      "notes.audit.created": "Created note: {{title}}",
      "notes.audit.updated": "Updated note: {{title}}",
      "notes.audit.deleted": "Deleted note: {{title}}",
    },
  },
};
