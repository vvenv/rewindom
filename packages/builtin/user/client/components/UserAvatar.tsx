import type { ReactNode } from "react";

import {
  COLOR_MODES,
  useAuth,
  useColorMode,
  useLocale,
  useShellLayout,
  useThemePalette,
  translateShellLayoutOptions,
  translateThemePaletteOptions,
} from "@rewindom/client-kit";
import {
  APP_LOCALES,
  formatBusinessDateOrTimeAgo,
  isRegularUser,
  normalizeLocale,
  normalizeShellLayout,
  normalizeThemePalette,
} from "@rewindom/shared";
import { Avatar, AvatarFallback } from "@rewindom/ui/avatar";
import { Button } from "@rewindom/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@rewindom/ui/dropdown-menu";
import { cn } from "@rewindom/ui/utils";
import {
  ArrowLeft,
  Key,
  Languages,
  LogOut,
  Palette,
  PanelsTopLeft,
  Shield,
  SunMoon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
  /**
   * 租户壳为 true：额外露出配色 / 布局（依赖 AppLayout 的 Provider）。
   * 平台控制台为 false：只保留语言与明暗（全局生效）。
   */
  showShellPreferences?: boolean;
}

function PreferenceSubmenu({
  icon,
  label,
  value,
  options,
  onValueChange,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  options: Array<{ slug: string; label: string }>;
  onValueChange: (value: string) => void;
  className?: string;
}): ReactNode {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={className}>
        {icon}
        <span>{label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-max">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.slug} value={option.slug}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function UserAvatar({
  menuSide = "bottom",
  menuAlign = "end",
  showShellPreferences = false,
}: UserAvatarProps) {
  const { t: tShell, i18n } = useTranslation("shell");
  const { t: tCommon } = useTranslation("common");
  const { t: tUser } = useTranslation("user");
  const { user, logout } = useAuth();
  const { locale, setLocale } = useLocale();
  const { palette, setPalette } = useThemePalette();
  const { layout, setLayout } = useShellLayout();
  const { colorMode, setColorMode } = useColorMode();
  const UsageCard = userMenuUsageSlot.useSlot();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleFullLogout = async () => {
    try {
      await logoutFully(logout);
    } catch (error) {
      console.error("Logout failed:", error);
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
  const profile = getUserDisplayProfile(user, readImpersonationMeta(), tUser);
  const paletteOptions = translateThemePaletteOptions(tShell);
  const layoutOptions = translateShellLayoutOptions(tShell);

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
                  {tShell("lastLogin", {
                    time: formatBusinessDateOrTimeAgo(user.last_login_at),
                  })}
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
                  <span>{tShell("changePassword")}</span>
                </DropdownMenuItem>
              }
            />
          </>
        )}
        <DropdownMenuSeparator />
        <PreferenceSubmenu
          icon={<Languages className="size-4" />}
          label={tCommon("language")}
          value={locale}
          options={APP_LOCALES.map((option) => ({
            slug: option.slug,
            label: option.native_label,
          }))}
          onValueChange={(value) => setLocale(normalizeLocale(value))}
        />
        {showShellPreferences ? (
          <>
            <PreferenceSubmenu
              key={`palette-${i18n.language}`}
              icon={<Palette className="size-4" />}
              label={tShell("theme")}
              value={palette}
              options={paletteOptions}
              onValueChange={(value) =>
                setPalette(normalizeThemePalette(value))
              }
            />
            <PreferenceSubmenu
              key={`layout-${i18n.language}`}
              icon={<PanelsTopLeft className="size-4" />}
              label={tShell("layout")}
              value={layout}
              options={layoutOptions}
              onValueChange={(value) => setLayout(normalizeShellLayout(value))}
              className="max-md:hidden"
            />
          </>
        ) : null}
        <PreferenceSubmenu
          icon={<SunMoon className="size-4" />}
          label={tShell("colorMode")}
          value={colorMode}
          options={COLOR_MODES.map((mode) => ({
            slug: mode,
            label: tShell(`colorModes.${mode}`),
          }))}
          onValueChange={(value) => {
            if ((COLOR_MODES as readonly string[]).includes(value)) {
              setColorMode(value as (typeof COLOR_MODES)[number]);
            }
          }}
        />
        {impersonating ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={exitImpersonation}>
              <ArrowLeft className="size-4" />
              <span>{tShell("backToPlatform")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void handleFullLogout()}
              className="text-destructive"
            >
              <LogOut className="size-4" />
              <span>{tShell("fullLogout")}</span>
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
              <span>{tShell("logout")}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
