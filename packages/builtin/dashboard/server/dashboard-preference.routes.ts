import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";

import { normalizeDashboardPreferenceInput } from "../shared/index.js";

import {
  getDashboardPreference,
  resetDashboardPreference,
  saveDashboardPreference,
} from "./dashboard-preference.service.js";

import type { FastifyInstance } from "fastify";

/**
 * 只认证、不查权限：工作台是登录落地页，任何登录用户都得能读写**自己**的布局。
 * 租户与用户维度全部取自会话（`tenantContext` / `authUser`），请求体里没有 user_id
 * 可传，因此不存在改别人布局的入口。
 */
export async function dashboardPreferenceRoutes(app: FastifyInstance) {
  defineRoute(app, {
    method: "GET",
    url: "/preferences",
    onRequest: [app.authenticate],
    context: "[dashboardRoutes] 获取工作台偏好失败",
    errorCode: "GET_DASHBOARD_PREFERENCE_FAILED",
    handler: async (request) =>
      getDashboardPreference(
        app.prisma,
        request.tenantContext!.tenant_id,
        request.authUser!.userId,
      ),
  });

  defineRoute(app, {
    method: "PUT",
    url: "/preferences",
    // audit:skip -- 用户自己的卡片显隐与排序，不是对租户数据的写操作；每次拖拽都留痕会把审计淹掉
    onRequest: [app.authenticate],
    context: "[dashboardRoutes] 保存工作台偏好失败",
    errorCode: "SAVE_DASHBOARD_PREFERENCE_FAILED",
    handler: async (request) =>
      saveDashboardPreference(
        app.prisma,
        request.tenantContext!.tenant_id,
        request.authUser!.userId,
        normalizeDashboardPreferenceInput(request.body),
      ),
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/preferences",
    // audit:skip -- 同上，重置的也只是本人的界面偏好
    onRequest: [app.authenticate],
    context: "[dashboardRoutes] 重置工作台偏好失败",
    errorCode: "RESET_DASHBOARD_PREFERENCE_FAILED",
    handler: async (request) =>
      resetDashboardPreference(
        app.prisma,
        request.tenantContext!.tenant_id,
        request.authUser!.userId,
      ),
  });
}
