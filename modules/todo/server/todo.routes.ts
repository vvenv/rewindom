import {
  defineRoute,
  parseSortDir,
  parsePagination,
  sendCodedError,
  AppError,
  emitAuditLogFromRequestSafe,
} from "@be-water/module-sdk/server";

import {
  clearCompletedTodos,
  createTodo,
  deleteTodo,
  getTodo,
  listTodos,
  setAllTodosCompleted,
  updateTodo,
} from "./todo.service.js";

import type { FastifyInstance } from "fastify";

export async function todoRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "TodoList",
    errorCode: "TODO_LIST_FAILED",
    preHandler: [app.requirePermission("todo.read")],
    handler: async (request) => {
      const { q, completed, sort_by, sort_dir } = request.query as {
        q?: string;
        completed?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );

      return listTodos({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q,
        // 只认显式的 true/false，其它值（含缺省）一律当「全部」
        completed:
          completed === "true"
            ? true
            : completed === "false"
              ? false
              : undefined,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
      });
    },
  });

  // 注意：静态路径要在 /:todo_id 之前声明，读起来才不会误以为会被参数路由吃掉
  defineRoute(app, {
    method: "DELETE",
    url: "/completed",
    context: "TodoClearCompleted",
    errorCode: "TODO_CLEAR_COMPLETED_FAILED",
    preHandler: [app.requirePermission("todo.write")],
    handler: async (request) => {
      const deleted = await clearCompletedTodos(
        request.tenantContext!.tenant_id,
      );

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: "TODO_CLEAR_COMPLETED",
        detail_key: "todo.audit.clear_completed",
        detail_params: { count: deleted },
      });

      return { deleted };
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/toggle-all",
    context: "TodoToggleAll",
    errorCode: "TODO_TOGGLE_ALL_FAILED",
    preHandler: [app.requirePermission("todo.write")],
    handler: async (request, reply) => {
      const body = request.body as { completed?: unknown };
      if (typeof body?.completed !== "boolean") {
        return sendCodedError(reply, 400, "todo.completed_must_be_boolean");
      }

      const updated = await setAllTodosCompleted({
        tenant_id: request.tenantContext!.tenant_id,
        user_id: request.authUser!.userId,
        completed: body.completed,
      });

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: "TODO_TOGGLE_ALL",
        detail_key: body.completed
          ? "todo.audit.toggle_all_done"
          : "todo.audit.toggle_all_active",
        detail_params: { count: updated },
      });

      return { updated };
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/:todo_id",
    context: "TodoDetail",
    errorCode: "TODO_DETAIL_FAILED",
    preHandler: [app.requirePermission("todo.read")],
    handler: async (request, reply) => {
      try {
        const { todo_id } = request.params as { todo_id: string };
        return await getTodo(request.tenantContext!.tenant_id, todo_id);
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/",
    context: "TodoCreate",
    errorCode: "TODO_CREATE_FAILED",
    preHandler: [app.requirePermission("todo.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as { title?: string; completed?: boolean };
        const todo = await createTodo({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          title: body.title ?? "",
          completed: body.completed,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "TODO_CREATE",
          resource: todo.id,
          detail_key: "todo.audit.created",
          detail_params: { title: todo.title },
        });

        return todo;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/:todo_id",
    context: "TodoUpdate",
    errorCode: "TODO_UPDATE_FAILED",
    preHandler: [app.requirePermission("todo.write")],
    handler: async (request, reply) => {
      try {
        const { todo_id } = request.params as { todo_id: string };
        const body = request.body as { title?: string; completed?: boolean };
        const todo = await updateTodo({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          todo_id,
          title: body.title,
          completed: body.completed,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "TODO_UPDATE",
          resource: todo.id,
          detail_key: "todo.audit.updated",
          detail_params: { title: todo.title },
        });

        return todo;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/:todo_id",
    context: "TodoDelete",
    errorCode: "TODO_DELETE_FAILED",
    preHandler: [app.requirePermission("todo.write")],
    handler: async (request, reply) => {
      try {
        const { todo_id } = request.params as { todo_id: string };
        const existing = await getTodo(
          request.tenantContext!.tenant_id,
          todo_id,
        );
        await deleteTodo(request.tenantContext!.tenant_id, todo_id);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "TODO_DELETE",
          resource: existing.id,
          detail_key: "todo.audit.deleted",
          detail_params: { title: existing.title },
        });

        return { deleted: true };
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}
