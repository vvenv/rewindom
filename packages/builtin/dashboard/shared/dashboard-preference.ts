/**
 * 工作台卡片的**用户级**偏好：哪些卡片隐藏、卡片按什么顺序排。
 *
 * 存服务端而不是 localStorage：工作台是登录落地页，用户换设备/换浏览器时
 * 布局跟着走才算「按当前用户配置」；主题与侧栏布局那类纯视觉偏好仍留在本地。
 */
export interface DashboardPreference {
  /** 用户显式隐藏的卡片 id。 */
  hidden_widgets: string[];
  /**
   * 用户自定义的卡片顺序。只记 id，不记位置：
   * 不在这个数组里的卡片（新装的模块）按模块声明的 `order` 排在**其后**。
   */
  widget_order: string[];
  /** 从未配置过时为 `null`（即「跟随各模块默认」）。 */
  updated_at: string | null;
}

export type UpdateDashboardPreferenceInput = Pick<
  DashboardPreference,
  "hidden_widgets" | "widget_order"
>;

/**
 * 单次提交最多记住多少张卡片。工作台卡片来自已启用模块，正常量级是个位数到几十；
 * 上限只为挡住构造出来的超长数组，别让一行 `text[]` 无限增长。
 */
export const MAX_DASHBOARD_WIDGET_IDS = 200;

/** 卡片 id 约定是 `<moduleId>.<name>`，128 字符足够宽松。 */
export const MAX_DASHBOARD_WIDGET_ID_LENGTH = 128;

export function createEmptyDashboardPreference(): DashboardPreference {
  return { hidden_widgets: [], widget_order: [], updated_at: null };
}

/**
 * 收敛为「去重、去空、限长」的 id 数组。
 *
 * 客户端与服务端共用同一份实现：客户端提交前先收敛，避免把脏数据发出去；
 * 服务端仍要再收敛一遍——请求体不可信，且历史行里可能留着旧模块的 id。
 */
export function normalizeDashboardWidgetIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || id.length > MAX_DASHBOARD_WIDGET_ID_LENGTH) continue;
    seen.add(id);
    if (seen.size >= MAX_DASHBOARD_WIDGET_IDS) break;
  }
  return [...seen];
}

export function normalizeDashboardPreferenceInput(
  body: unknown,
): UpdateDashboardPreferenceInput {
  const source = (body ?? {}) as Partial<UpdateDashboardPreferenceInput>;
  return {
    hidden_widgets: normalizeDashboardWidgetIds(source.hidden_widgets),
    widget_order: normalizeDashboardWidgetIds(source.widget_order),
  };
}
