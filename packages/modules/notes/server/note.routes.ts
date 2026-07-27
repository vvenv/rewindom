
import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { parseSortDir } from "@be-water/server-kernel/http/list-sort.js";
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import { NotFoundError, ValidationError } from "@be-water/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";


import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  updateNote,
} from "./note.service.js";

import type { FastifyInstance } from "fastify";

export async function noteRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "NoteList",
    errorCode: "NOTE_LIST_FAILED",
    preHandler: [app.requirePermission("notes.read")],
    handler: async (request) => {
      const { q, sort_by, sort_dir } = request.query as {
        q?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );

      return listNotes({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/:note_id",
    context: "NoteDetail",
    errorCode: "NOTE_DETAIL_FAILED",
    preHandler: [app.requirePermission("notes.read")],
    handler: async (request, reply) => {
      try {
        const { note_id } = request.params as { note_id: string };
        return await getNote(request.tenantContext!.tenant_id, note_id);
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.code(404).send({ error: err.message });
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/",
    context: "NoteCreate",
    errorCode: "NOTE_CREATE_FAILED",
    preHandler: [app.requirePermission("notes.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as { title?: string; content?: string };
        const note = await createNote({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          title: body.title ?? "",
          content: body.content,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            userId: request.authUser!.userId,
            username: request.authUser!.username,
            action: AuditAction.NOTE_CREATE,
            resource: note.id,
            details: `创建笔记：${note.title}`,
          })

        return note;
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.code(400).send({ error: err.message });
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/:note_id",
    context: "NoteUpdate",
    errorCode: "NOTE_UPDATE_FAILED",
    preHandler: [app.requirePermission("notes.write")],
    handler: async (request, reply) => {
      try {
        const { note_id } = request.params as { note_id: string };
        const body = request.body as { title?: string; content?: string };
        const note = await updateNote({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          note_id,
          title: body.title,
          content: body.content,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            userId: request.authUser!.userId,
            username: request.authUser!.username,
            action: AuditAction.NOTE_UPDATE,
            resource: note.id,
            details: `更新笔记：${note.title}`,
          })

        return note;
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.code(404).send({ error: err.message });
        }
        if (err instanceof ValidationError) {
          return reply.code(400).send({ error: err.message });
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/:note_id",
    context: "NoteDelete",
    errorCode: "NOTE_DELETE_FAILED",
    preHandler: [app.requirePermission("notes.write")],
    handler: async (request, reply) => {
      try {
        const { note_id } = request.params as { note_id: string };
        const existing = await getNote(request.tenantContext!.tenant_id, note_id);
        await deleteNote(request.tenantContext!.tenant_id, note_id);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            userId: request.authUser!.userId,
            username: request.authUser!.username,
            action: AuditAction.NOTE_DELETE,
            resource: existing.id,
            details: `删除笔记：${existing.title}`,
          })

        return { deleted: true };
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.code(404).send({ error: err.message });
        }
        throw err;
      }
    },
  });
}
