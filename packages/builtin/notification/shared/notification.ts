/**
 * 通知类型由**产生通知的业务模块**自行定义（如 `"note_shared"`）；
 * 底座只负责存储、去重与未读计数，不枚举业务语义。
 */
export type NotificationType = string;

export type NotificationSeverity = "info" | "warning" | "critical";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  link_path: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationUnreadCount {
  total: number;
  by_severity: Record<NotificationSeverity, number>;
}

export interface NotificationsPage {
  items: NotificationItem[];
  total: number;
  page: number;
  page_size: number;
}

export const NOTIFICATION_SEVERITIES: NotificationSeverity[] = [
  "info",
  "warning",
  "critical",
];

export function createEmptyNotificationUnreadCount(): NotificationUnreadCount {
  return {
    total: 0,
    by_severity: {
      info: 0,
      warning: 0,
      critical: 0,
    },
  };
}
