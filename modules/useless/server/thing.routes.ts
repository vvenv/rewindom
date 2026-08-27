import {
  defineRoute,
  parseSortDir,
  parsePagination,
  sendCodedError,
  AppError,
  emitAuditLogFromRequestSafe,
} from "@rewindom/module-sdk/server";

import { buildThingPreview } from "./thing.util.js";

import {
  createThing,
  deleteThing,
  getThing,
  listThings,
  updateThing,
} from "./thing.service.js";

import type { FastifyInstance } from "fastify";

export async function thingRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "ThingList",
    errorCode: "THING_LIST_FAILED",
    preHandler: [app.requirePermission("things.read")],
    handler: async (request) => {
      const { q, sort_by, sort_dir } = request.query as {
        q?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );

      return listThings({
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
    url: "/:thing_id",
    context: "ThingDetail",
    errorCode: "THING_DETAIL_FAILED",
    preHandler: [app.requirePermission("things.read")],
    handler: async (request, reply) => {
      try {
        const { thing_id } = request.params as { thing_id: string };
        return await getThing(request.tenantContext!.tenant_id, thing_id);
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
    context: "ThingCreate",
    errorCode: "THING_CREATE_FAILED",
    preHandler: [app.requirePermission("things.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as { text?: string; enabled?: boolean };
        const thing = await createThing({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          text: body.text ?? "",
          enabled: body.enabled,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "THING_CREATE",
          resource: thing.id,
          detail_key: "useless.audit.created",
          detail_params: { text: buildThingPreview(thing.text) },
        });

        return thing;
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
    url: "/:thing_id",
    context: "ThingUpdate",
    errorCode: "THING_UPDATE_FAILED",
    preHandler: [app.requirePermission("things.write")],
    handler: async (request, reply) => {
      try {
        const { thing_id } = request.params as { thing_id: string };
        const body = request.body as { text?: string; enabled?: boolean };
        const thing = await updateThing({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          thing_id,
          text: body.text,
          enabled: body.enabled,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "THING_UPDATE",
          resource: thing.id,
          detail_key: "useless.audit.updated",
          detail_params: { text: buildThingPreview(thing.text) },
        });

        return thing;
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
    url: "/:thing_id",
    context: "ThingDelete",
    errorCode: "THING_DELETE_FAILED",
    preHandler: [app.requirePermission("things.write")],
    handler: async (request, reply) => {
      try {
        const { thing_id } = request.params as { thing_id: string };
        const existing = await getThing(
          request.tenantContext!.tenant_id,
          thing_id,
        );
        await deleteThing(request.tenantContext!.tenant_id, thing_id);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "THING_DELETE",
          resource: existing.id,
          detail_key: "useless.audit.deleted",
          detail_params: { text: buildThingPreview(existing.text) },
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
