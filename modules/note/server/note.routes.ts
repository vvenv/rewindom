
import {
  defineRoute,
  parseSortDir,
  parsePagination,
  sendCodedError,
  AppError,
  emitAuditLogFromRequestSafe,
} from "@be-water/module-sdk/server";

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
    preHandler: [app.requirePermission("note.read")],
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
    preHandler: [app.requirePermission("note.read")],
    handler: async (request, reply) => {
      try {
        const { note_id } = request.params as { note_id: string };
        return await getNote(request.tenantContext!.tenant_id, note_id);
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
    context: "NoteCreate",
    errorCode: "NOTE_CREATE_FAILED",
    preHandler: [app.requirePermission("note.write")],
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
          action: "NOTE_CREATE",
          resource: note.id,
          detail_key: "note.audit.created",
          detail_params: { title: note.title },
        });

        return note;
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
    url: "/:note_id",
    context: "NoteUpdate",
    errorCode: "NOTE_UPDATE_FAILED",
    preHandler: [app.requirePermission("note.write")],
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
          action: "NOTE_UPDATE",
          resource: note.id,
          detail_key: "note.audit.updated",
          detail_params: { title: note.title },
        });

        return note;
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
    url: "/:note_id",
    context: "NoteDelete",
    errorCode: "NOTE_DELETE_FAILED",
    preHandler: [app.requirePermission("note.write")],
    handler: async (request, reply) => {
      try {
        const { note_id } = request.params as { note_id: string };
        const existing = await getNote(request.tenantContext!.tenant_id, note_id);
        await deleteNote(request.tenantContext!.tenant_id, note_id);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "NOTE_DELETE",
          resource: existing.id,
          detail_key: "note.audit.deleted",
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
