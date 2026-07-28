import {
  THEME_PALETTES,
  getThemePaletteLabel,
  normalizeOptionalThemePalette,
} from "@be-water/shared";
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

import { useThemePalette } from "../contexts/theme-palette-context.js";

/** 「跟随默认」在 radio group 里的哨兵值——DropdownMenuRadioItem 只接受字符串。 */
const FOLLOW_DEFAULT = "";

/**
 * 配色方案切换器。与 {@link ThemeToggle}（浅色/深色/跟随系统）并列摆放：
 * 两者是正交的两根轴，每个配色自带明暗两套 token。
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
  const { palette, userChoice, defaultPalette, setPalette } = useThemePalette();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0", className)}
          title={`当前主题: ${getThemePaletteLabel(palette)}`}
        >
          <Palette className="size-4" />
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      {/* collisionPadding：贴边时也留 8px，不要糊在屏幕边缘上 */}
      <DropdownMenuContent
        side={menuSide}
        align={menuAlign}
        collisionPadding={8}
        className="w-56"
      >
        <DropdownMenuLabel>主题</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={userChoice ?? FOLLOW_DEFAULT}
          onValueChange={(value) =>
            setPalette(normalizeOptionalThemePalette(value))
          }
        >
          <DropdownMenuRadioItem value={FOLLOW_DEFAULT}>
            <div className="flex flex-col gap-0.5">
              <span>跟随默认</span>
              <span className="text-muted-foreground text-xs">
                当前为「{getThemePaletteLabel(defaultPalette)}」
              </span>
            </div>
          </DropdownMenuRadioItem>
          {THEME_PALETTES.map((option) => (
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
