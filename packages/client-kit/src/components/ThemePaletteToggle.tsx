import { normalizeThemePalette } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { cn } from "@be-water/ui/utils";
import { Palette } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useThemePalette } from "../contexts/theme-palette-context.js";
import {
  translateThemePaletteLabel,
  translateThemePaletteOptions,
} from "../lib/translate-theme-palette.js";

/**
 * 配色方案切换器。与 {@link ThemeToggle}（浅色/深色/跟随系统）并列摆放：
 * 两者是正交的两根轴，每个配色自带明暗两套 token。
 *
 * 未显式选过时仍走租户/平台默认；点选后写入本地偏好。
 */
export function ThemePaletteToggle({
  className,
  // 默认按侧边栏页脚（屏幕左下角）摆：向上向右展开，与同处该位置的 UserAvatar 一致。
  // align="end" 会让菜单朝屏幕左边缘挤过去。
  menuSide = "top",
  menuAlign = "start",
}: {
  className?: string;
  menuSide?: "top" | "bottom" | "left" | "right";
  menuAlign?: "start" | "center" | "end";
}) {
  const { t, i18n } = useTranslation("shell");
  const { palette, setPalette } = useThemePalette();
  const options = translateThemePaletteOptions(t);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0", className)}
          title={t("currentTheme", {
            label: translateThemePaletteLabel(t, palette),
          })}
        >
          <Palette className="size-4" />
          <span className="sr-only">{t("switchTheme")}</span>
        </Button>
      </DropdownMenuTrigger>
      {/* collisionPadding：贴边时也留 8px，不要糊在屏幕边缘上 */}
      <DropdownMenuContent
        side={menuSide}
        align={menuAlign}
        collisionPadding={8}
        className="w-56"
      >
        <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          key={i18n.language}
          value={palette}
          onValueChange={(value) => setPalette(normalizeThemePalette(value))}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.slug} value={option.slug}>
              <div className="flex flex-col gap-0.5">
                <span>{option.label}</span>
                <span className="text-muted-foreground text-xs">
                  {option.description}
                </span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
