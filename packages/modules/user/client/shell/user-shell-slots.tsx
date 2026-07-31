import type { ReactNode } from "react";

import { type SidebarUserMenuSlotProps } from "@be-water/client-kit";

import {
  userAvatarSlot,
  userRoleBadgeSlot,
} from "../../../platform/client/shell/platform-widget-slots.js";
import { UserAvatar } from "../components/UserAvatar.js";
import { UserRoleBadge } from "../components/UserRoleBadge.js";

export function UserSidebarMenu({
  collapsed,
  showLabel,
  // 默认按侧边栏页脚（屏幕左下角）摆；顶栏布局会传 bottom/end 覆盖。
  menuSide = "top",
  menuAlign = "start",
}: SidebarUserMenuSlotProps) {
  return (
    <UserAvatar
      showLabel={!collapsed && showLabel}
      menuSide={menuSide}
      menuAlign={menuAlign}
      showShellPreferences
    />
  );
}

function PlatformUserAvatar() {
  return <UserAvatar />;
}

/** Registers user widgets (avatar, role badge) into shared slots for the platform console. */
export function UserShellSlots({ children }: { children: ReactNode }) {
  return (
    <userAvatarSlot.Provider component={PlatformUserAvatar}>
      <userRoleBadgeSlot.Provider component={UserRoleBadge}>
        {children}
      </userRoleBadgeSlot.Provider>
    </userAvatarSlot.Provider>
  );
}
