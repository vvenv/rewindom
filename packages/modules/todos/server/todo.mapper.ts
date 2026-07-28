import type { Todo, TodoListItem } from "../shared/index.js";
import type { Todo as TodoRecord } from "@be-water/server-kernel/generated/prisma/client/client.js";

export function toTodoListItem(record: TodoRecord): TodoListItem {
  return {
    id: record.id,
    title: record.title,
    completed: record.completed,
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function toTodo(record: TodoRecord): Todo {
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    title: record.title,
    completed: record.completed,
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}
