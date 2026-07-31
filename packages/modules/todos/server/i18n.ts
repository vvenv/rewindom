import type { ServerI18nBundle } from "@be-water/server-kernel/runtime/module-contract.js";

export const TODOS_SERVER_I18N: ServerI18nBundle = {
  id: "todos",
  messages: {
    "zh-CN": {
      "todos.not_found": "待办不存在",
      "todos.title_required": "请输入标题",
      "todos.audit.created": "创建待办：{{title}}",
      "todos.audit.updated": "更新待办：{{title}}",
      "todos.audit.deleted": "删除待办：{{title}}",
      "todos.audit.clear_completed": "清除已完成待办：{{count}} 条",
      "todos.audit.toggle_all_done": "全部标记完成：{{count}} 条",
      "todos.audit.toggle_all_active": "全部标记未完成：{{count}} 条",
    },
    en: {
      "todos.not_found": "Todo not found",
      "todos.title_required": "Please enter a title",
      "todos.audit.created": "Created todo: {{title}}",
      "todos.audit.updated": "Updated todo: {{title}}",
      "todos.audit.deleted": "Deleted todo: {{title}}",
      "todos.audit.clear_completed": "Cleared completed todos: {{count}}",
      "todos.audit.toggle_all_done": "Marked all complete: {{count}}",
      "todos.audit.toggle_all_active": "Marked all incomplete: {{count}}",
    },
  },
};
