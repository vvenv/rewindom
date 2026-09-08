/**
 * 租户面：`/api/ip-rules` —— 站点自己维护的访问名单。
 *
 * 这里创建的规则只作用于本站点的 Host，永远压不过平台全局规则（见 decision.ts）。
 */
import { sendCodedError } from "@rewindom/server-kernel/http/coded-error.js";
import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import { parseSortDir } from "@rewindom/server-kernel/http/list-sort.js";
import { parsePagination } from "@rewindom/server-kernel/http/pagination.js";
import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";
import { getClientIp } from "@rewindom/server-kernel/lib/client-ip.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";

import {
  createIpRule,
  deleteIpRule,
  listIpRules,
  updateIpRule,
  type RuleScopeSelector,
} from "./ip-access.service.js";

import type { IpAccessRuleWriteBody } from "../shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";

function tenantScope(request: FastifyRequest): RuleScopeSelector {
  return { kind: "tenant", tenant_id: request.tenantContext!.tenant_id };
}

export async function ipAccessRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "IpRuleList",
    errorCode: "IP_RULE_LIST_FAILED",
    preHandler: [app.requirePermission("ip_access.read")],
    handler: async (request) => {
      const { q, action, source, sort_by, sort_dir } = request.query as {
        q?: string;
        action?: string;
        source?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );
      return listIpRules({
        scope: tenantScope(request),
        page,
        page_size,
        q,
        action,
        source,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/",
    context: "IpRuleCreate",
    errorCode: "IP_RULE_CREATE_FAILED",
    preHandler: [app.requirePermission("ip_access.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as IpAccessRuleWriteBody;
        const rule = await createIpRule({
          scope: tenantScope(request),
          cidr: body.cidr ?? "",
          action: body.action,
          mode: body.mode,
          reason: body.reason ?? "",
          created_by: request.authUser!.userId,
          expires_at: body.expires_at,
          requester_ip: getClientIp(request),
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "IP_RULE_CREATE",
          resource: rule.id,
          detail_key: "ip_access.audit.created",
          detail_params: {
            cidr: rule.cidr,
            rule_action: rule.action,
            mode: rule.mode,
          },
        });
        return rule;
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
    url: "/:ruleId",
    context: "IpRuleUpdate",
    errorCode: "IP_RULE_UPDATE_FAILED",
    preHandler: [app.requirePermission("ip_access.write")],
    handler: async (request, reply) => {
      try {
        const { ruleId } = request.params as { ruleId: string };
        const body = request.body as Partial<IpAccessRuleWriteBody>;
        const rule = await updateIpRule({
          scope: tenantScope(request),
          rule_id: ruleId,
          action: body.action,
          mode: body.mode,
          reason: body.reason,
          expires_at: body.expires_at,
          requester_ip: getClientIp(request),
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "IP_RULE_UPDATE",
          resource: rule.id,
          detail_key: "ip_access.audit.updated",
          detail_params: {
            cidr: rule.cidr,
            rule_action: rule.action,
            mode: rule.mode,
          },
        });
        return rule;
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
    url: "/:ruleId",
    context: "IpRuleDelete",
    errorCode: "IP_RULE_DELETE_FAILED",
    preHandler: [app.requirePermission("ip_access.write")],
    handler: async (request, reply) => {
      try {
        const { ruleId } = request.params as { ruleId: string };
        const removed = await deleteIpRule(tenantScope(request), ruleId);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "IP_RULE_DELETE",
          resource: removed.id,
          detail_key: "ip_access.audit.deleted",
          detail_params: { cidr: removed.cidr },
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
