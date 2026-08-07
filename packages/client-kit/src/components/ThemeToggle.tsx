import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

const COLOR_MODES = ["light", "dark", "system"] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation("shell");
  const { theme, setTheme, resolvedTheme } = useTheme();
  // 首帧 next-themes 还没读到偏好（theme 为 undefined），按「跟随系统」显示。
  const mode = theme === "light" || theme === "dark" ? theme : "system";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      onClick={() => {
        const nextIndex = (COLOR_MODES.indexOf(mode) + 1) % COLOR_MODES.length;
        setTheme(COLOR_MODES[nextIndex]);
      }}
      title={t("currentColorMode", { label: t(`colorModes.${mode}`) })}
    >
      {mode === "system" ? (
        <Monitor className="size-4" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Button>
  );
}
