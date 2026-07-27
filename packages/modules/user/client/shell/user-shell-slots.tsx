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
}: SidebarUserMenuSlotProps) {
  return (
    <UserAvatar
      showLabel={!collapsed && showLabel}
      menuSide="top"
      menuAlign="start"
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
