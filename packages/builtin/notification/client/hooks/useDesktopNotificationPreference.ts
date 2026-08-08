import { useCallback, useState } from "react";

import {
  isDesktopNotificationSupported,
  readDesktopNotificationBackgroundOnly,
  readDesktopNotificationEnabled,
  requestDesktopNotificationPermission,
  writeDesktopNotificationBackgroundOnly,
  writeDesktopNotificationEnabled,
} from "../lib/desktop-notification.js";

export function useDesktopNotificationPreference() {
  const supported = isDesktopNotificationSupported();
  const permission: NotificationPermission = supported
    ? Notification.permission
    : "denied";

  const [enabled, setEnabledState] = useState(() =>
    readDesktopNotificationEnabled(),
  );
  const [backgroundOnly, setBackgroundOnlyState] = useState(() =>
    readDesktopNotificationBackgroundOnly(),
  );

  const setEnabled = useCallback((value: boolean) => {
    writeDesktopNotificationEnabled(value);
    setEnabledState(value);
  }, []);

  const setBackgroundOnly = useCallback((value: boolean) => {
    writeDesktopNotificationBackgroundOnly(value);
    setBackgroundOnlyState(value);
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    const result = await requestDesktopNotificationPermission();
    const granted = result === "granted";
    writeDesktopNotificationEnabled(granted);
    setEnabledState(granted);
    return result;
  }, []);

  return {
    supported,
    permission,
    enabled,
    backgroundOnly,
    setEnabled,
    setBackgroundOnly,
    requestPermission,
  };
}
