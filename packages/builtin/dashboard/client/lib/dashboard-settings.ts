import { sortDashboardWidgetsByPreference } from "./dashboard-widgets.js";

import type {
  DashboardPreference,
  UpdateDashboardPreferenceInput,
} from "../../shared/index.js";
import type { DashboardWidget } from "@rewindom/client-kit";
import type { LucideIcon } from "lucide-react";

/**
 * 配置面板里的一行。与 `DashboardWidget` 的区别是**不含 `component`**：
 * 面板只排序和开关，不渲染卡片，把组件带进来只会让这一层被迫依赖渲染细节。
 */
export interface DashboardSettingsEntry {
  id: string;
  /** `namespace:key`，由面板渲染时解析。 */
  title: string;
  description?: string;
  icon?: LucideIcon;
  hidden: boolean;
}

/**
 * 把「租户/权限允许的卡片」+「用户偏好」摊平成面板列表。
 *
 * 与工作台的渲染顺序严格一致（同一个 `sortDashboardWidgetsByPreference`），
 * 差别只在于**隐藏的卡片也在列表里**——否则用户没有地方把它开回来。
 */
export function buildDashboardSettingsEntries(
  allowedWidgets: readonly DashboardWidget[],
  preference?: DashboardPreference,
): DashboardSettingsEntry[] {
  const hidden = new Set(preference?.hidden_widgets ?? []);
  return sortDashboardWidgetsByPreference(
    allowedWidgets,
    preference?.widget_order ?? [],
  ).map((widget) => ({
    id: widget.id,
    title: widget.title,
    description: widget.description,
    icon: widget.icon,
    hidden: hidden.has(widget.id),
  }));
}

export function toggleDashboardSettingsEntry(
  entries: readonly DashboardSettingsEntry[],
  id: string,
): DashboardSettingsEntry[] {
  return entries.map((entry) =>
    entry.id === id ? { ...entry, hidden: !entry.hidden } : entry,
  );
}

/** 把 `activeId` 挪到 `overId` 当前所在的位置（dnd-kit 的 arrayMove 语义）。 */
export function moveDashboardSettingsEntry(
  entries: readonly DashboardSettingsEntry[],
  activeId: string,
  overId: string,
): DashboardSettingsEntry[] {
  const from = entries.findIndex((entry) => entry.id === activeId);
  const to = entries.findIndex((entry) => entry.id === overId);
  if (from < 0 || to < 0 || from === to) {
    return [...entries];
  }

  const next = [...entries];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/**
 * 面板列表 → 提交给服务端的偏好。
 *
 * `widget_order` 记**全部**卡片（含隐藏的）：隐藏只是暂时不显示，用户把它开回来时
 * 应当回到原来的位置，而不是掉到末尾。
 */
export function toDashboardPreferenceInput(
  entries: readonly DashboardSettingsEntry[],
): UpdateDashboardPreferenceInput {
  return {
    hidden_widgets: entries
      .filter((entry) => entry.hidden)
      .map((entry) => entry.id),
    widget_order: entries.map((entry) => entry.id),
  };
}

/** 面板是否已改动过（决定保存按钮是否可点）。 */
export function hasDashboardSettingsChanged(
  entries: readonly DashboardSettingsEntry[],
  allowedWidgets: readonly DashboardWidget[],
  preference?: DashboardPreference,
): boolean {
  const baseline = buildDashboardSettingsEntries(allowedWidgets, preference);
  if (baseline.length !== entries.length) return true;
  return entries.some(
    (entry, index) =>
      baseline[index]!.id !== entry.id || baseline[index]!.hidden !== entry.hidden,
  );
}
