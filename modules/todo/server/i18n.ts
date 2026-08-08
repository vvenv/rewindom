import type { ServerI18nBundle } from "@be-water/module-sdk/server";

export const TODO_SERVER_I18N: ServerI18nBundle = {
  id: "todo",
  messages: {
    "zh-CN": {
      "todo.not_found": "待办不存在",
      "todo.title_required": "请输入标题",
      "todo.audit.created": "创建待办：{{title}}",
      "todo.audit.updated": "更新待办：{{title}}",
      "todo.audit.deleted": "删除待办：{{title}}",
      "todo.audit.clear_completed": "清除已完成待办：{{count}} 条",
      "todo.audit.toggle_all_done": "全部标记完成：{{count}} 条",
      "todo.audit.toggle_all_active": "全部标记未完成：{{count}} 条",
    },
    en: {
      "todo.not_found": "Todo not found",
      "todo.title_required": "Please enter a title",
      "todo.audit.created": "Created todo: {{title}}",
      "todo.audit.updated": "Updated todo: {{title}}",
      "todo.audit.deleted": "Deleted todo: {{title}}",
      "todo.audit.clear_completed": "Cleared completed todos: {{count}}",
      "todo.audit.toggle_all_done": "Marked all complete: {{count}}",
      "todo.audit.toggle_all_active": "Marked all incomplete: {{count}}",
    },
  },
};
