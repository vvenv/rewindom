import { useAuth } from "@be-water/client-kit";
import { formatBusinessDateOrTimeAgo, isRegularUser  } from "@be-water/shared";
import { Avatar, AvatarFallback } from "@be-water/ui/avatar";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { cn } from "@be-water/ui/utils";
import { ArrowLeft, Key, LogOut, Shield } from "lucide-react";


import {
  exitImpersonation,
  isInImpersonationSession,
  logoutFully,
} from "../../../platform/client/lib/impersonation-session.js";
import { readImpersonationMeta } from "../../../platform/client/lib/impersonation-storage.js";
import { getUserDisplayProfile } from "../lib/user-display.js";
import { userMenuUsageSlot } from "../shell/user-menu-slots.js";

import { ChangePasswordDialog } from "./ChangePasswordDialog.js";

interface UserAvatarProps {
  showLabel?: boolean;
  menuSide?: "top" | "bottom" | "left" | "right";
  menuAlign?: "start" | "center" | "end";
}

export function UserAvatar({
  menuSide = "bottom",
  menuAlign = "end",
}: UserAvatarProps) {
  const { user, logout } = useAuth();
  const UsageCard = userMenuUsageSlot.useSlot();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("退出登录失败:", error);
    }
  };

  const handleFullLogout = async () => {
    try {
      await logoutFully(logout);
    } catch (error) {
      console.error("退出登录失败:", error);
    }
  };

  const getAvatarColor = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    const saturation = 60 + (Math.abs(hash) % 20);
    const lightness = 85 + (Math.abs(hash) % 10);
    return {
      backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      lightness,
    };
  };

  const getTextColor = (lightness: number) => {
    return lightness >= 60 ? "#1f2937" : "#ffffff";
  };

  const getColorStyle = (seed: string) => {
    const avatarColor = getAvatarColor(seed);
    return {
      backgroundColor: avatarColor.backgroundColor,
      color: getTextColor(avatarColor.lightness),
    };
  };

  if (!user) {
    return null;
  }

  const impersonating = isInImpersonationSession();
  const profile = getUserDisplayProfile(user, readImpersonationMeta());

  const avatar = (
    <Avatar className="h-10 w-10" size="sm">
      <AvatarFallback
        className="font-semibold text-sm"
        style={getColorStyle(profile.avatarSeed)}
      >
        {profile.initials}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          {avatar}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" side={menuSide} align={menuAlign}>
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
              <AvatarFallback
                className="font-semibold text-xl"
                style={getColorStyle(profile.avatarSeed)}
              >
                {profile.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5">
              <p className="text-xl font-semibold leading-none">
                {profile.displayName}
              </p>
              <p
                className={cn(
                  "leading-none text-muted-foreground",
                  "flex items-center gap-1.5",
                )}
              >
                {profile.showSuperuserShield && (
                  <Shield className="size-3.5 text-yellow-500" />
                )}
                {profile.subtitle}
              </p>
              {profile.showLastLogin && user.last_login_at && (
                <p className="text-muted-foreground">
                  上次登录：
                  {formatBusinessDateOrTimeAgo(user.last_login_at)}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        {isRegularUser(user, impersonating) && (
          <>
            {UsageCard && <UsageCard />}
            <DropdownMenuSeparator />
            <ChangePasswordDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Key className="size-4" />
                  <span>修改密码</span>
                </DropdownMenuItem>
              }
            />
          </>
        )}
        {impersonating ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={exitImpersonation}>
              <ArrowLeft className="size-4" />
              <span>返回平台管理</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void handleFullLogout()}
              className="text-destructive"
            >
              <LogOut className="size-4" />
              <span>完全退出</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void handleLogout()}
              className="text-destructive"
            >
              <LogOut className="size-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
