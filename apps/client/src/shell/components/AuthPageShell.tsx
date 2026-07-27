import { useRef, type ReactNode } from "react";

import { AppVersion, Logo, ThemeToggle } from "@be-water/client-kit";
import { cn } from "@be-water/ui/utils";
import { useTheme } from "next-themes";

import { AuthWaterBackground } from "./AuthWaterBackground.js";

export function AuthPageShell({
  children,
  contentClassName,
  hero,
  mobileHero,
}: {
  children: ReactNode;
  contentClassName?: string;
  hero?: ReactNode;
  mobileHero?: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const heroPanelRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isSplitLayout = hero != null;

  if (!isSplitLayout) {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
        <AuthWaterBackground isDark={isDark} targetRef={cardRef} />

        <div
          aria-hidden
          className="auth-vignette pointer-events-none absolute inset-0 z-1"
        />
        <div
          aria-hidden
          className="auth-noise pointer-events-none absolute inset-0 z-1"
        />

        <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
          <ThemeToggle className="auth-theme-toggle rounded-xl" />
        </div>

        <div
          ref={cardRef}
          className={cn(
            "auth-card-enter relative z-10 w-full max-w-sm",
            contentClassName,
          )}
        >
          {children}
        </div>

        {/* 跟随卡片流式排布而不是绝对定位到视口底部：注册卡很高，
            绝对定位会让版本号压在卡片里 */}
        <AppVersion className="relative z-20 mt-10 text-center text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div
        ref={heroPanelRef}
        className="auth-hero-panel relative hidden overflow-hidden p-12 lg:flex lg:flex-col xl:p-16"
      >
        <AuthWaterBackground isDark targetRef={heroPanelRef} />
        {/* 品牌水印：圆器盛水的 Logo 半沉在画面右下，被内容与暗角压住，只留轮廓 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-28 z-1 xl:-right-32"
        >
          <Logo className="size-[32rem] text-white/[0.022] xl:size-[38rem]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-1 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_30%,rgba(0,0,0,0.45)_100%)]"
        />
        <div
          aria-hidden
          className="auth-noise pointer-events-none absolute inset-0 z-1"
        />
        {hero}
      </div>

      <div className="relative flex min-h-svh flex-col justify-center overflow-hidden p-4 sm:p-6 lg:bg-background lg:px-12 lg:py-16 xl:px-16">
        <AuthWaterBackground
          isDark={isDark}
          targetRef={cardRef}
          className="lg:hidden"
        />
        <div
          aria-hidden
          className="auth-vignette pointer-events-none absolute inset-0 z-1 lg:hidden"
        />
        <div
          aria-hidden
          className="auth-noise pointer-events-none absolute inset-0 z-1 lg:hidden"
        />
        {/* 桌面端表单一侧不铺水面（会和表单抢注意力），只留一层极淡的水色，
            免得紧挨着 hero 时读成一块无关的色板 */}
        <div
          aria-hidden
          className="auth-form-wash pointer-events-none absolute inset-0 hidden lg:block"
        />

        <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
          <ThemeToggle className="auth-theme-toggle rounded-xl" />
        </div>

        {mobileHero != null && (
          <div className="relative z-10 lg:hidden">{mobileHero}</div>
        )}

        <div
          ref={cardRef}
          className={cn(
            "auth-card-enter relative z-10 mx-auto w-full max-w-sm",
            contentClassName,
          )}
        >
          {children}
        </div>

        <AppVersion className="relative z-20 mt-10 text-center text-muted-foreground/50" />
      </div>
    </div>
  );
}
