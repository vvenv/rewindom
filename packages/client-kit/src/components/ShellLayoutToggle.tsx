import { normalizeShellLayout } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { cn } from "@be-water/ui/utils";
import { PanelsTopLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useShellLayout } from "../contexts/shell-layout-context.js";
import {
  translateShellLayoutLabel,
  translateShellLayoutOptions,
} from "../lib/translate-shell-layout.js";

/**
 * 外壳布局切换器（左右 / 上下）。与主题、明暗两个切换器并列。
 *
 * 只在 md+ 渲染：窄屏恒定使用移动端外壳，摆一个不生效的开关只会误导用户。
 * 未显式选过时仍走租户/平台默认；点选后写入本地偏好。
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
  const { t, i18n } = useTranslation("shell");
  const { layout, setLayout } = useShellLayout();
  const options = translateShellLayoutOptions(t);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("hidden shrink-0 md:inline-flex", className)}
          title={t("currentLayout", {
            label: translateShellLayoutLabel(t, layout),
          })}
        >
          <PanelsTopLeft className="size-4" />
          <span className="sr-only">{t("switchLayout")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={menuSide}
        align={menuAlign}
        collisionPadding={8}
        className="w-max"
      >
        <DropdownMenuRadioGroup
          key={i18n.language}
          value={layout}
          onValueChange={(value) => setLayout(normalizeShellLayout(value))}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.slug} value={option.slug}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
