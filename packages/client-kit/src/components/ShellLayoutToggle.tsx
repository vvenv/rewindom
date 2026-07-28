import {
  SHELL_LAYOUTS,
  getShellLayoutLabel,
  normalizeOptionalShellLayout,
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
import { PanelsTopLeft } from "lucide-react";

import { useShellLayout } from "../contexts/shell-layout-context.js";

/** 「跟随默认」在 radio group 里的哨兵值——DropdownMenuRadioItem 只接受字符串。 */
const FOLLOW_DEFAULT = "";

/**
 * 外壳布局切换器（左右 / 上下）。与主题、明暗两个切换器并列。
 *
 * 只在 md+ 渲染：窄屏恒定使用移动端外壳，摆一个不生效的开关只会误导用户。
 */
export function ShellLayoutToggle({
  className,
  menuSide = "top",
  menuAlign = "start",
}: {
  className?: string;
  menuSide?: "top" | "bottom" | "left" | "right";
  menuAlign?: "start" | "center" | "end";
}) {
  const { layout, userChoice, defaultLayout, setLayout } = useShellLayout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("hidden shrink-0 md:inline-flex", className)}
          title={`当前布局: ${getShellLayoutLabel(layout)}`}
        >
          <PanelsTopLeft className="size-4" />
          <span className="sr-only">切换布局</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={menuSide}
        align={menuAlign}
        collisionPadding={8}
        className="w-60"
      >
        <DropdownMenuLabel>布局</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={userChoice ?? FOLLOW_DEFAULT}
          onValueChange={(value) =>
            setLayout(normalizeOptionalShellLayout(value))
          }
        >
          <DropdownMenuRadioItem value={FOLLOW_DEFAULT}>
            <div className="flex flex-col gap-0.5">
              <span>跟随默认</span>
              <span className="text-muted-foreground text-xs">
                当前为「{getShellLayoutLabel(defaultLayout)}」
              </span>
            </div>
          </DropdownMenuRadioItem>
          {SHELL_LAYOUTS.map((option) => (
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
