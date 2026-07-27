import { useEffect, useRef } from "react";

import { useNavigate } from "react-router";

import { useMarkNotificationRead } from "../hooks/useMarkNotificationRead.js";
import { useNotifications } from "../hooks/useNotifications.js";
import {
  clearNotificationPushWatermark,
  readNotificationPushWatermark,
  showDesktopNotification,
  writeNotificationPushWatermark,
} from "../lib/desktop-notification.js";

export function NotificationBridge() {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const { data } = useNotifications(1, 50, true);
  const pushedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onLogout = () => {
      clearNotificationPushWatermark();
      pushedIdsRef.current.clear();
    };
    window.addEventListener("authLogout", onLogout);
    return () => window.removeEventListener("authLogout", onLogout);
  }, []);

  useEffect(() => {
    const items = data?.items ?? [];
    if (items.length === 0) return;

    const watermark = readNotificationPushWatermark();
    let latest = watermark;

    for (const item of items) {
      if (pushedIdsRef.current.has(item.id)) continue;
      if (watermark && item.created_at <= watermark) continue;

      showDesktopNotification(
        item,
        (path) => navigate(path),
        (id) => markRead.mutate(id),
      );
      pushedIdsRef.current.add(item.id);
      if (item.created_at > latest) {
        latest = item.created_at;
      }
    }

    if (latest !== watermark) {
      writeNotificationPushWatermark(latest);
    }
  }, [data?.items, navigate, markRead]);

  return null;
}
