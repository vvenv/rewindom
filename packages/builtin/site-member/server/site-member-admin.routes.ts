import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { parseSortDir } from "@be-water/server-kernel/http/list-sort.js";
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import { handleValidationError } from "@be-water/server-kernel/http/route-error-handler.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";

import {
  deleteSiteMember,
  getSiteMember,
  listSiteMembers,
  updateSiteMember,
} from "./site-member-admin.service.js";
import { SiteMemberAuthService } from "./site-member-auth.service.js";

import type { SiteMemberUpdateBody } from "../shared/site-member.js";
import type { FastifyInstance } from "fastify";

export async function siteMemberAdminRoutes(
  app: FastifyInstance,
): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "SiteMemberList",
    errorCode: "SITE_MEMBER_LIST_FAILED",
    preHandler: [app.requirePermission("site_members.read")],
    handler: async (request) => {
      const { q, sort_by, sort_dir } = request.query as {
        q?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );

      return listSiteMembers({
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
    method: "PATCH",
    url: "/:memberId",
    context: "SiteMemberUpdate",
    errorCode: "SITE_MEMBER_UPDATE_FAILED",
    preHandler: [app.requirePermission("site_members.write")],
    handler: async (request, reply) => {
      const { memberId } = request.params as { memberId: string };
      const body = request.body as SiteMemberUpdateBody;

      if (body.enabled === undefined && body.display_name === undefined) {
        return handleValidationError(reply, "common.no_fields_to_update");
      }

      const tenantId = request.tenantContext!.tenant_id;
      const member = await updateSiteMember(tenantId, memberId, body);

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.SITE_MEMBER_UPDATE,
        resource: `site_member:${member.id}`,
        detail_key: "site_member.audit.updated",
        detail_params: { email: member.email, enabled: body.enabled },
      });

      return member;
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/:memberId/reset-password",
    context: "SiteMemberResetPassword",
    errorCode: "SITE_MEMBER_RESET_PASSWORD_FAILED",
    preHandler: [app.requirePermission("site_members.write")],
    handler: async (request) => {
      const { memberId } = request.params as { memberId: string };
      const tenantId = request.tenantContext!.tenant_id;

      const member = await getSiteMember(tenantId, memberId);
      const password = await SiteMemberAuthService.resetPassword(
        memberId,
        tenantId,
      );

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.SITE_MEMBER_PASSWORD_RESET,
        resource: `site_member:${member.id}`,
        detail_key: "site_member.audit.password_reset",
        detail_params: { email: member.email },
      });

      return { password };
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/:memberId",
    context: "SiteMemberDelete",
    errorCode: "SITE_MEMBER_DELETE_FAILED",
    preHandler: [app.requirePermission("site_members.write")],
    handler: async (request) => {
      const { memberId } = request.params as { memberId: string };
      const tenantId = request.tenantContext!.tenant_id;
      const member = await deleteSiteMember(tenantId, memberId);

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.SITE_MEMBER_DELETE,
        resource: `site_member:${member.id}`,
        detail_key: "site_member.audit.deleted",
        detail_params: { email: member.email },
      });

      return { deleted: true };
    },
  });
}
