import { prisma } from "@be-water/module-sdk/server";

import type { Todo, TodoListItem } from "../shared/index.js";

/** 从 prisma 实例推导记录类型——无需直接 import 生成的 Prisma client 类型。 */
type TodoRecord = NonNullable<Awaited<ReturnType<typeof prisma.todo.findFirst>>>;

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
