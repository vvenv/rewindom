import {
  LocaleToggle,
  Logo,
  ThemeToggle,
  Wordmark,
  useOptionalAuth,
} from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { cn } from "@be-water/ui/utils";
import { LayoutDashboard, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";

import { SITE_NAV } from "../../shared/index.js";
import { useMarketingHref } from "../hooks/use-marketing-href.js";
import { resolveNavLabel } from "../lib/marketing-i18n.js";
import {
  marketingPathsMatch,
  swapMarketingLocale,
} from "../lib/marketing-locale-path.js";

import type { AppLocale } from "@be-water/shared";

/**
 * 控制台入口。
 *
 * 用 `useOptionalAuth` 而非 `useAuth`：预渲染时没有 `AuthProvider`，
 * 静态 HTML 一律按未登录渲染（爬虫和 CDN 缓存看到的就该是这一版），
 * 浏览器里 SPA 接管后才会显示「进入控制台」。目标统一是 `/app`——
 * 未登录会被守卫送去登录页，登录后再由落地页候选决定最终落点。
 */
function ConsoleEntry() {
  const { t } = useTranslation("marketing");
  const auth = useOptionalAuth();

  if (auth?.isAuthenticated) {
    return (
      <Button asChild variant="ghost" size="icon" className="rounded-lg">
        <Link
          to="/app"
          aria-label={t("header.enterConsole")}
          title={t("header.enterConsole")}
        >
          <LayoutDashboard className="size-4" />
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="lg"
        className="hidden px-3 md:inline-flex"
      >
        <Link to="/login">{t("header.login")}</Link>
      </Button>
      <Button asChild size="lg" className="px-3 sm:px-4">
        <Link to="/register">{t("header.getStarted")}</Link>
      </Button>
    </>
  );
}

function MobileNav({
  onLocaleNavigate,
}: {
  onLocaleNavigate: (locale: AppLocale) => void;
}) {
  const { t } = useTranslation("marketing");
  const { pathname } = useLocation();
  const hrefFor = useMarketingHref();
  const auth = useOptionalAuth();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg md:hidden"
          aria-label={t("header.menuOpen")}
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(100%,20rem)]">
        <SheetHeader>
          <SheetTitle>{t("nav.main")}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4" aria-label={t("nav.main")}>
          {SITE_NAV.map((link) => {
            const to = hrefFor(link.href);
            const active = marketingPathsMatch(pathname, link.href);
            return (
              <SheetClose asChild key={link.href}>
                <Link
                  to={to}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-base transition-colors",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {resolveNavLabel(link.href, t)}
                </Link>
              </SheetClose>
            );
          })}
          {!auth?.isAuthenticated ? (
            <SheetClose asChild>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2.5 text-base text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {t("header.login")}
              </Link>
            </SheetClose>
          ) : null}
        </nav>
        <div className="mt-auto flex items-center gap-1.5 border-t border-border/60 px-4 py-4">
          <LocaleToggle
            className="rounded-lg"
            menuSide="top"
            menuAlign="start"
            onLocaleNavigate={onLocaleNavigate}
          />
          <ThemeToggle className="rounded-lg" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function MarketingHeader() {
  const { t } = useTranslation("marketing");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hrefFor = useMarketingHref();

  const onLocaleNavigate = (locale: AppLocale): void => {
    navigate(swapMarketingLocale(pathname, locale));
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link
          to={hrefFor("/")}
          className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
          aria-label={t("site.homeAriaLabel")}
        >
          <Logo className="size-6" />
          <Wordmark className="h-3.5 w-auto hidden sm:block" />
        </Link>

        <nav
          className="ml-2 hidden items-center gap-1 md:flex"
          aria-label={t("nav.main")}
        >
          {SITE_NAV.map((link) => {
            const to = hrefFor(link.href);
            const active = marketingPathsMatch(pathname, link.href);
            return (
              <Link
                key={link.href}
                to={to}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {resolveNavLabel(link.href, t)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 md:flex">
            <LocaleToggle
              className="rounded-lg"
              menuSide="bottom"
              menuAlign="end"
              onLocaleNavigate={onLocaleNavigate}
            />
            <ThemeToggle className="rounded-lg" />
          </div>
          <ConsoleEntry />
          <MobileNav onLocaleNavigate={onLocaleNavigate} />
        </div>
      </div>
    </header>
  );
}
