import {
  resolveSortField,
  resolveSortOrder,
} from "@be-water/server-kernel/http/list-sort.js";
import {
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";

import { toTodo, toTodoListItem } from "./todo.mapper.js";
import { validateTodoInput } from "./todo.util.js";

import type { Todo, TodoListItem } from "../shared/index.js";

export interface ListTodosParams {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  /** 未传 = 全部；true/false = 只看已完成/未完成 */
  completed?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface ListTodosResult {
  items: TodoListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

const TODO_SORTABLE_FIELDS = new Set([
  "title",
  "completed",
  "updated_at",
  "created_at",
]);

type TodoOrderByField =
  | { title: "asc" | "desc" }
  | { completed: "asc" | "desc" }
  | { updated_at: "asc" | "desc" }
  | { created_at: "asc" | "desc" };

/**
 * 默认排序是复合的：未完成在前，同组内按最近更新。
 * 待办清单里「已完成的沉底」是基本预期，单字段默认排序做不到这件事。
 * 用户点了列排序则尊重其选择，退回单字段。
 */
function buildTodoOrderBy(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): TodoOrderByField | TodoOrderByField[] {
  if (!sortBy?.trim()) {
    return [{ completed: "asc" }, { updated_at: "desc" }];
  }
  const field = resolveSortField(sortBy, TODO_SORTABLE_FIELDS, "updated_at");
  const order = resolveSortOrder(sortDir, "desc");
  return { [field]: order } as TodoOrderByField;
}

function buildTodoListWhere(
  tenant_id: string,
  q?: string,
  completed?: boolean,
): ReturnType<typeof withTenantScope> {
  return withTenantScope(tenant_id, {
    ...(completed !== undefined ? { completed } : {}),
    ...(q?.trim()
      ? {
          OR: [{ title: { contains: q.trim(), mode: "insensitive" as const } }],
        }
      : {}),
  });
}

export async function listTodos(
  params: ListTodosParams,
): Promise<ListTodosResult> {
  const { tenant_id, page, page_size, q, completed, sort_by, sort_dir } =
    params;
  const skip = (page - 1) * page_size;

  const [records, total] = await Promise.all([
    prisma.todo.findMany({
      where: buildTodoListWhere(tenant_id, q, completed),
      orderBy: buildTodoOrderBy(sort_by, sort_dir),
      skip,
      take: page_size,
    }),
    prisma.todo.count({
      where: buildTodoListWhere(tenant_id, q, completed),
    }),
  ]);

  return {
    items: records.map(toTodoListItem),
    page,
    page_size,
    total,
    page_count: Math.ceil(total / page_size),
  };
}

export async function getTodo(
  tenant_id: string,
  todo_id: string,
): Promise<Todo> {
  const record = await prisma.todo.findFirst({
    where: withTenantScope(tenant_id, { id: todo_id }),
  });
  if (!record) {
    throw new NotFoundError("待办不存在");
  }
  return toTodo(record);
}

export async function createTodo(params: {
  tenant_id: string;
  user_id: string;
  title: string;
  completed?: boolean;
}): Promise<Todo> {
  const validationError = validateTodoInput({
    title: params.title,
    completed: params.completed,
  });
  if (validationError) {
    throw new ValidationError(validationError);
  }

  const record = await prisma.todo.create({
    data: {
      tenant_id: params.tenant_id,
      title: params.title.trim(),
      ...(params.completed !== undefined
        ? { completed: params.completed }
        : {}),
      created_by: params.user_id,
    },
  });

  return toTodo(record);
}

export async function updateTodo(params: {
  tenant_id: string;
  user_id: string;
  todo_id: string;
  title?: string;
  completed?: boolean;
}): Promise<Todo> {
  const validationError = validateTodoInput(
    {
      title: params.title,
      completed: params.completed,
    },
    { partial: true },
  );
  if (validationError) {
    throw new ValidationError(validationError);
  }

  const existing = await prisma.todo.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.todo_id }),
  });
  if (!existing) {
    throw new NotFoundError("待办不存在");
  }

  // 归属校验并进 where：上面的 findFirst 负责给出 404，
  // 这里再带一次租户谓词，使「校验」与「写入」落在同一条语句里。
  const record = await prisma.todo.update({
    where: withTenantScope(params.tenant_id, { id: params.todo_id }),
    data: {
      ...(params.title !== undefined ? { title: params.title.trim() } : {}),
      ...(params.completed !== undefined
        ? { completed: params.completed }
        : {}),
      updated_by: params.user_id,
    },
  });

  return toTodo(record);
}

export async function deleteTodo(
  tenant_id: string,
  todo_id: string,
): Promise<void> {
  const existing = await prisma.todo.findFirst({
    where: withTenantScope(tenant_id, { id: todo_id }),
  });
  if (!existing) {
    throw new NotFoundError("待办不存在");
  }

  // 同 update：租户谓词并进 delete 自身，避免 check-then-act 的时间窗。
  await prisma.todo.delete({
    where: withTenantScope(tenant_id, { id: todo_id }),
  });
}

/** 清除已完成：待办清单的标准批量操作，返回删除条数用于提示与审计。 */
export async function clearCompletedTodos(tenant_id: string): Promise<number> {
  const { count } = await prisma.todo.deleteMany({
    where: withTenantScope(tenant_id, { completed: true }),
  });
  return count;
}
