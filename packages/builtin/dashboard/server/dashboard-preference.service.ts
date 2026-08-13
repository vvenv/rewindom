import {
  createEmptyDashboardPreference,
  normalizeDashboardWidgetIds,
  type DashboardPreference,
  type UpdateDashboardPreferenceInput,
} from "../shared/index.js";

import type { PrismaClient } from "@rewindom/server-kernel/generated/prisma/client/client.js";

interface DashboardPreferenceRow {
  hidden_widgets: string[];
  widget_order: string[];
  updated_at: Date;
}

function toDashboardPreference(row: DashboardPreferenceRow): DashboardPreference {
  return {
    // 行里可能留着已卸载模块的卡片 id：读出来照样收敛，前端按现存卡片再取交集
    hidden_widgets: normalizeDashboardWidgetIds(row.hidden_widgets),
    widget_order: normalizeDashboardWidgetIds(row.widget_order),
    updated_at: row.updated_at.toISOString(),
  };
}

/** 没配置过的用户没有行——返回空偏好而不是 404，前端据此走各模块默认顺序。 */
export async function getDashboardPreference(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<DashboardPreference> {
  const row = await prisma.dashboardPreference.findUnique({
    where: { tenant_id_user_id: { tenant_id: tenantId, user_id: userId } },
  });

  return row ? toDashboardPreference(row) : createEmptyDashboardPreference();
}

export async function saveDashboardPreference(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  input: UpdateDashboardPreferenceInput,
): Promise<DashboardPreference> {
  const hidden_widgets = normalizeDashboardWidgetIds(input.hidden_widgets);
  const widget_order = normalizeDashboardWidgetIds(input.widget_order);

  const row = await prisma.dashboardPreference.upsert({
    where: { tenant_id_user_id: { tenant_id: tenantId, user_id: userId } },
    create: { tenant_id: tenantId, user_id: userId, hidden_widgets, widget_order },
    update: { hidden_widgets, widget_order },
  });

  return toDashboardPreference(row);
}

/** 恢复默认：直接删行，比写两个空数组更干净（下次读取即空偏好）。 */
export async function resetDashboardPreference(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<DashboardPreference> {
  await prisma.dashboardPreference.deleteMany({
    where: { tenant_id: tenantId, user_id: userId },
  });
  return createEmptyDashboardPreference();
}
