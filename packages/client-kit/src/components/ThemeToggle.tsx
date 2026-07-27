import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";


export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      onClick={() => {
        const themes: string[] = ["light", "dark", "system"];
        const currentIndex = themes.indexOf(theme ?? "system");
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
      }}
      title={`当前主题: ${theme === "system" ? "跟随系统" : theme === "dark" ? "深色" : "浅色"}`}
    >
      {theme === "system" ? (
        <Monitor className="size-4" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Button>
  );
}
