import { STORAGE_PREFIX } from "@rewindom/shared";

import type { NotificationItem } from "../../shared/index.js";

export const DESKTOP_NOTIFICATION_ENABLED_KEY =
  `${STORAGE_PREFIX}_desktop_notification_enabled`;
export const DESKTOP_NOTIFICATION_BACKGROUND_ONLY_KEY =
  `${STORAGE_PREFIX}_desktop_notification_background_only`;
export const DESKTOP_NOTIFICATION_WATERMARK_KEY =
  `${STORAGE_PREFIX}_notification_push_watermark`;

export function isDesktopNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function readDesktopNotificationEnabled(): boolean {
  if (!isDesktopNotificationSupported()) return false;
  return localStorage.getItem(DESKTOP_NOTIFICATION_ENABLED_KEY) === "true";
}

export function writeDesktopNotificationEnabled(enabled: boolean): void {
  localStorage.setItem(
    DESKTOP_NOTIFICATION_ENABLED_KEY,
    enabled ? "true" : "false",
  );
}

export function readDesktopNotificationBackgroundOnly(): boolean {
  return (
    localStorage.getItem(DESKTOP_NOTIFICATION_BACKGROUND_ONLY_KEY) === "true"
  );
}

export function writeDesktopNotificationBackgroundOnly(enabled: boolean): void {
  localStorage.setItem(
    DESKTOP_NOTIFICATION_BACKGROUND_ONLY_KEY,
    enabled ? "true" : "false",
  );
}

export function readNotificationPushWatermark(): string {
  return localStorage.getItem(DESKTOP_NOTIFICATION_WATERMARK_KEY) ?? "";
}

export function writeNotificationPushWatermark(isoTime: string): void {
  localStorage.setItem(DESKTOP_NOTIFICATION_WATERMARK_KEY, isoTime);
}

export function clearNotificationPushWatermark(): void {
  localStorage.removeItem(DESKTOP_NOTIFICATION_WATERMARK_KEY);
}

export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!isDesktopNotificationSupported()) return "denied";
  return Notification.requestPermission();
}

export function showDesktopNotification(
  item: NotificationItem,
  onNavigate: (path: string) => void,
  onRead: (id: string) => void,
): void {
  if (!readDesktopNotificationEnabled()) return;
  if (Notification.permission !== "granted") return;

  const onlyWhenHidden = readDesktopNotificationBackgroundOnly();
  if (
    onlyWhenHidden &&
    item.severity !== "critical" &&
    document.visibilityState === "visible"
  ) {
    return;
  }

  const notification = new Notification(item.title, {
    body: item.body,
    tag: item.id,
    icon: "/favicon.svg",
    silent: item.severity === "info",
  });

  notification.onclick = () => {
    window.focus();
    if (item.link_path) {
      onNavigate(item.link_path);
    }
    onRead(item.id);
    notification.close();
  };
}
