import type { ServerI18nBundle } from "@be-water/module-sdk/server";

export const NOTE_SERVER_I18N: ServerI18nBundle = {
  id: "note",
  messages: {
    "zh-CN": {
      "note.not_found": "笔记不存在",
      "note.title_required": "标题不能为空",
      "note.audit.created": "创建笔记：{{title}}",
      "note.audit.updated": "更新笔记：{{title}}",
      "note.audit.deleted": "删除笔记：{{title}}",
    },
    en: {
      "note.not_found": "Note not found",
      "note.title_required": "Title is required",
      "note.audit.created": "Created note: {{title}}",
      "note.audit.updated": "Updated note: {{title}}",
      "note.audit.deleted": "Deleted note: {{title}}",
    },
  },
};
