import {
  resolveSortField,
  resolveSortOrder,
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
} from "@be-water/module-sdk/server";

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
  /** 下面两项跨分页、且不受 completed 筛选影响——页脚的「剩余 N 项」要的是全量口径 */
  active_count: number;
  completed_count: number;
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
 * 默认按录入顺序（created_at asc）——TodoMVC 语义：勾选完成不改变行的位置。
 * 曾经默认「已完成沉底」，但配合就地勾选会让刚点的那行跳走，手要重新找位置。
 * 调用方仍可显式传 sort_by 取回单字段排序。
 */
function buildTodoOrderBy(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): TodoOrderByField | TodoOrderByField[] {
  if (!sortBy?.trim()) {
    return [{ created_at: "asc" }];
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

  // 两个分组计数顺带把 total 也算了出来：完成态只有两种，不必再发一条 count
  const [records, active_count, completed_count] = await Promise.all([
    prisma.todo.findMany({
      where: buildTodoListWhere(tenant_id, q, completed),
      orderBy: buildTodoOrderBy(sort_by, sort_dir),
      skip,
      take: page_size,
    }),
    prisma.todo.count({ where: buildTodoListWhere(tenant_id, q, false) }),
    prisma.todo.count({ where: buildTodoListWhere(tenant_id, q, true) }),
  ]);

  const total =
    completed === undefined
      ? active_count + completed_count
      : completed
        ? completed_count
        : active_count;

  return {
    items: records.map(toTodoListItem),
    page,
    page_size,
    total,
    page_count: Math.ceil(total / page_size),
    active_count,
    completed_count,
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
    throw new NotFoundError("todo.not_found");
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
    throw new ValidationError(validationError.code, validationError.params);
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
    throw new ValidationError(validationError.code, validationError.params);
  }

  const existing = await prisma.todo.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.todo_id }),
  });
  if (!existing) {
    throw new NotFoundError("todo.not_found");
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
    throw new NotFoundError("todo.not_found");
  }

  // 同 update：租户谓词并进 delete 自身，避免 check-then-act 的时间窗。
  await prisma.todo.delete({
    where: withTenantScope(tenant_id, { id: todo_id }),
  });
}

/**
 * 一键全选 / 全不选：只写完成态与目标不同的行，
 * 让返回的条数就是真正改动的行数（提示与审计都按这个数说话）。
 */
export async function setAllTodosCompleted(params: {
  tenant_id: string;
  user_id: string;
  completed: boolean;
}): Promise<number> {
  const { count } = await prisma.todo.updateMany({
    where: withTenantScope(params.tenant_id, { completed: !params.completed }),
    data: { completed: params.completed, updated_by: params.user_id },
  });
  return count;
}

/** 清除已完成：待办清单的标准批量操作，返回删除条数用于提示与审计。 */
export async function clearCompletedTodos(tenant_id: string): Promise<number> {
  const { count } = await prisma.todo.deleteMany({
    where: withTenantScope(tenant_id, { completed: true }),
  });
  return count;
}
