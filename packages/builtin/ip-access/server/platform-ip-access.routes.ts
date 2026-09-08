/**
 * 平台面：`/api/platform/ip-rules` —— 全局名单，作用于所有 Host。
 *
 * 与租户面的差别不只是作用域：全局规则压过一切租户 allow，是平台最后的处置手段。
 * 因此这里只认平台管理员（前缀外层已挂 `requirePlatformAdmin`）。
 */
import { sendCodedError } from "@rewindom/server-kernel/http/coded-error.js";
import { parseSortDir } from "@rewindom/server-kernel/http/list-sort.js";
import { parsePagination } from "@rewindom/server-kernel/http/pagination.js";
import { handleRouteError } from "@rewindom/server-kernel/http/route-error-handler.js";
import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";
import { getClientIp } from "@rewindom/server-kernel/lib/client-ip.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";
import { success } from "@rewindom/shared";


import { getIpAccessCacheStatus } from "./ip-access.cache.js";
import {
  createIpRule,
  deleteIpRule,
  getIpAccessRuntimeConfig,
  listIpRules,
  updateIpRule,
  type RuleScopeSelector,
} from "./ip-access.service.js";
import { exportNginxBlocklist } from "./nginx-export.js";

import type { IpAccessRuleWriteBody } from "../shared/index.js";
import type { FastifyInstance, FastifyReply } from "fastify";

const PLATFORM_SCOPE: RuleScopeSelector = { kind: "platform" };

/** 带 code 的业务错误按 code 回；其余交给全局错误处理器。 */
function fail(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof AppError && err.code) {
    sendCodedError(reply, err.status, err.code, err.params);
    return reply;
  }
  throw err;
}

export async function registerPlatformIpAccessRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/ip-rules", async (request, reply) => {
    try {
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
      const result = await listIpRules({
        scope: PLATFORM_SCOPE,
        page,
        page_size,
        q,
        action,
        source,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
      });
      return reply.send(success(result));
    } catch (error) {
      handleRouteError(
        reply,
        error,
        "PlatformIpRuleList",
        "PLATFORM_IP_RULE_LIST_FAILED",
      );
      return reply;
    }
  });

  /** 运行时状态：豁免名单、自动封禁参数、快照是否加载成功。排障第一站。 */
  app.get("/ip-rules/status", async (_request, reply) => {
    return reply.send(
      success({
        ...getIpAccessRuntimeConfig(),
        cache: getIpAccessCacheStatus(),
      }),
    );
  });

  app.post("/ip-rules", async (request, reply) => {
    try {
      const body = request.body as IpAccessRuleWriteBody;
      const rule = await createIpRule({
        scope: PLATFORM_SCOPE,
        cidr: body.cidr ?? "",
        action: body.action,
        mode: body.mode,
        reason: body.reason ?? "",
        created_by: request.authUser?.username ?? "platform",
        expires_at: body.expires_at,
        requester_ip: getClientIp(request),
      });

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username: request.authUser?.username ?? "platform",
        scope: "platform",
        action: "IP_RULE_CREATE",
        resource: rule.id,
        detail_key: "ip_access.audit.created",
        detail_params: {
          cidr: rule.cidr,
          rule_action: rule.action,
          mode: rule.mode,
        },
      });
      return reply.code(201).send(success(rule));
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.patch("/ip-rules/:ruleId", async (request, reply) => {
    try {
      const { ruleId } = request.params as { ruleId: string };
      const body = request.body as Partial<IpAccessRuleWriteBody>;
      const rule = await updateIpRule({
        scope: PLATFORM_SCOPE,
        rule_id: ruleId,
        action: body.action,
        mode: body.mode,
        reason: body.reason,
        expires_at: body.expires_at,
        requester_ip: getClientIp(request),
      });

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username: request.authUser?.username ?? "platform",
        scope: "platform",
        action: "IP_RULE_UPDATE",
        resource: rule.id,
        detail_key: "ip_access.audit.updated",
        detail_params: {
          cidr: rule.cidr,
          rule_action: rule.action,
          mode: rule.mode,
        },
      });
      return reply.send(success(rule));
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.delete("/ip-rules/:ruleId", async (request, reply) => {
    try {
      const { ruleId } = request.params as { ruleId: string };
      const removed = await deleteIpRule(PLATFORM_SCOPE, ruleId);

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username: request.authUser?.username ?? "platform",
        scope: "platform",
        action: "IP_RULE_DELETE",
        resource: removed.id,
        detail_key: "ip_access.audit.deleted",
        detail_params: { cidr: removed.cidr },
      });
      return reply.send(success({ deleted: true }));
    } catch (error) {
      return fail(reply, error);
    }
  });

  /** 手动触发边缘层名单导出（正常由写操作与定时任务自动触发）。 */
  app.post("/ip-rules/export", async (request, reply) => {
    try {
      const result = await exportNginxBlocklist();
      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username: request.authUser?.username ?? "platform",
        scope: "platform",
        action: "IP_RULE_EXPORT",
        resource: result.path ?? "-",
        detail_key: "ip_access.audit.exported",
        detail_params: { count: result.count },
      });
      return reply.send(success(result));
    } catch (error) {
      handleRouteError(
        reply,
        error,
        "PlatformIpRuleExport",
        "PLATFORM_IP_RULE_EXPORT_FAILED",
      );
      return reply;
    }
  });
}
