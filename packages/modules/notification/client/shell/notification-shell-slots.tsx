import type { ReactNode } from "react";

import { activityCenterSlot } from "../../../platform/client/shell/platform-widget-slots.js";
import { ActivityCenter } from "../components/ActivityCenter.js";


/** 将活动中心注入 module-platform 声明的平台头部 slot（提供方自注册，平台壳层不 import 本模块组件）。 */
export function NotificationShellSlots({ children }: { children: ReactNode }) {
  return (
    <activityCenterSlot.Provider component={ActivityCenter}>
      {children}
    </activityCenterSlot.Provider>
  );
}
