import {
  Logo,
  ThemeToggle,
  Wordmark,
  useOptionalAuth,
} from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";
import { Link, useLocation } from "react-router";

import { SITE_NAV } from "../../shared/index.js";

/**
 * 控制台入口。
 *
 * 用 `useOptionalAuth` 而非 `useAuth`：预渲染时没有 `AuthProvider`，
 * 静态 HTML 一律按未登录渲染（爬虫和 CDN 缓存看到的就该是这一版），
 * 浏览器里 SPA 接管后才会显示「进入控制台」。目标统一是 `/app`——
 * 未登录会被守卫送去登录页，登录后再由落地页候选决定最终落点。
 */
function ConsoleEntry() {
  const auth = useOptionalAuth();

  if (auth?.isAuthenticated) {
    return (
      <Button asChild size="lg" className="px-4">
        <Link to="/app">进入控制台</Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="lg"
        className="hidden px-3 sm:inline-flex"
      >
        <Link to="/login">登录</Link>
      </Button>
      <Button asChild size="lg" className="px-4">
        <Link to="/register">免费开始</Link>
      </Button>
    </>
  );
}

export function MarketingHeader() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
          aria-label="be-water 首页"
        >
          <Logo className="size-6" />
          <Wordmark className="h-3.5 w-auto" />
        </Link>

        <nav className="ml-2 flex items-center gap-1" aria-label="主导航">
          {SITE_NAV.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle className="rounded-lg" />
          <ConsoleEntry />
        </div>
      </div>
    </header>
  );
}
