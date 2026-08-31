import { normalizeLocale } from "@rewindom/module-sdk";

import { buildPreviewContext } from "./sections/context.js";
import { renderUselessTemplatePage } from "./ssr/useless-page.js";

import {
  defineRoute,
  requestOriginFromHeaders,
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

import {
  USELESS_THING_PAGE_KIND,
  USELESS_THING_TEMPLATE_PRESET,
} from "../shared/useless-page-templates.js";
import { thingPath } from "../shared/useless-section-context.js";

import type {
  CreateThingBody,
  UpdateThingBody,
} from "../shared/index.js";
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

  /*
   * 中台预览：把这一个东西渲染成**整张详情页**，连页头页脚一起。
   *
   * 为什么不直接给公开地址加个 `?preview=`：工作台用的是 Bearer token 而不是
   * cookie（见 `auth.middleware.ts`），浏览器整页跳转带不上会话，那条路要额外
   * 造一套短时预览令牌。这里就是一个普通的工作台接口，不新增任何公开面。
   *
   * 未启用的东西没有公开地址，只能这样看——而这恰恰是最需要看的：
   * 可交互的东西是直接注入页面的 HTML/JS，上线前必须眼见为实。
   */
  defineRoute(app, {
    method: "GET",
    url: "/:thing_id/preview",
    context: "ThingPreview",
    errorCode: "THING_PREVIEW_FAILED",
    preHandler: [app.requirePermission("things.read")],
    handler: async (request, reply) => {
      try {
        const { thing_id } = request.params as { thing_id: string };
        const tenant = request.tenantContext!;
        const thing = await getThing(tenant.tenant_id, thing_id);

        const origin =
          requestOriginFromHeaders(request) ?? `http://${tenant.tenant_slug}`;
        const { locale } = request.query as { locale?: string };
        const pageLocale =
          typeof locale === "string" ? normalizeLocale(locale) : "zh-CN";

        const html = await renderUselessTemplatePage({
          tenantId: tenant.tenant_id,
          tenantSlug: tenant.tenant_slug,
          origin,
          locale: pageLocale,
          kind: USELESS_THING_PAGE_KIND,
          path: thing.slug ? thingPath(thing.slug) : `/preview/${thing.id}`,
          preset: USELESS_THING_TEMPLATE_PRESET,
          useless: buildPreviewContext(thing, pageLocale),
          title: thing.title || undefined,
          noindex: true,
        });

        return { html };
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
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
        const body = request.body as CreateThingBody;
        const thing = await createThing({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          ...body,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "THING_CREATE",
          resource: thing.id,
          detail_key: "useless.audit.created",
          detail_params: { text: buildThingPreview(thing.title || thing.text) },
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
        const body = request.body as UpdateThingBody;
        const thing = await updateThing({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          thing_id,
          ...body,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "THING_UPDATE",
          resource: thing.id,
          detail_key: "useless.audit.updated",
          detail_params: { text: buildThingPreview(thing.title || thing.text) },
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
          detail_params: { text: buildThingPreview(existing.title || existing.text) },
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
