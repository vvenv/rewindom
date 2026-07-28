import { useMemo } from "react";

import {
  Logo,
  ShellLayoutToggle,
  ThemePaletteToggle,
  ThemeToggle,
  useAppHomePath,
  usePersistState,
  type AppNavItem,
  type AppNavSection,
  useNavBadgeCount,
  useTenantEntitlements,
  usePermissions,
} from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { Separator } from "@be-water/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
} from "@be-water/ui/sheet";
import { cn } from "@be-water/ui/utils";
import { PanelLeft, PanelLeftClose, type LucideIcon } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";

import { useAppShellConfig } from "../contexts/app-shell-context.js";
import {
  getNavBadgeTitle,
  useFilteredNavSections,
} from "../hooks/useFilteredNavSections.js";

import { ShellSlotList } from "./ShellSlotList.js";

const SIDEBAR_ICON_BUTTON =
  "text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

function SidebarNavItem({
  to,
  icon: Icon,
  label,
  end = false,
  activePrefix,
  onClick,
  collapsed = false,
  badgeKey,
  badgeTitle,
  itemTitle,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  activePrefix?: string;
  onClick?: () => void;
  collapsed?: boolean;
  badgeKey?: AppNavItem["badgeKey"];
  badgeTitle?: string;
  itemTitle?: string;
}) {
  const location = useLocation();
  const { isNavRouteActive } = useAppShellConfig();
  const badgeCount = useNavBadgeCount(badgeKey);
  const resolvedBadgeTitle =
    badgeTitle ?? getNavBadgeTitle(badgeKey, badgeCount);

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={itemTitle ?? (collapsed ? label : undefined)}
      className={({ isActive }) => {
        const active =
          isActive ||
          isNavRouteActive(location.pathname, { path: to, end, activePrefix });

        return cn(
          "inline-flex shrink-0 items-center rounded-lg border-l-2 text-sm font-medium text-sidebar-foreground transition-colors outline-none select-none",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed
            ? "relative size-8 justify-center"
            : "h-8 w-full justify-start gap-1.5 px-2.5",
          active
            ? "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "border-transparent",
        );
      }}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
      {badgeCount > 0 ? (
        <Badge
          variant="destructive"
          title={resolvedBadgeTitle}
          className={cn(
            "h-4 min-w-4 justify-center px-1 text-[10px]",
            collapsed ? "absolute -right-1 -top-1" : "ml-auto",
          )}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </Badge>
      ) : null}
    </NavLink>
  );
}

function SidebarSectionLabel({ children }: { children: string }) {
  return (
    <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
      {children}
    </p>
  );
}

function SidebarGlobalActions({
  className,
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  const { shellContributions } = useAppShellConfig();

  return (
    <div
      className={cn(
        "flex items-center",
        orientation === "vertical" && "flex-col gap-1",
        className,
      )}
    >
      <ShellSlotList
        components={shellContributions.sidebarToolbar}
        render={(Component, index) => <Component key={index} />}
      />
    </div>
  );
}

function SidebarFooter({ collapsed = false }: { collapsed?: boolean }) {
  const { shellContributions } = useAppShellConfig();
  const UserMenu = shellContributions.sidebarUserMenu[0];

  if (collapsed) {
    return (
      <div className="mt-auto flex flex-col items-center gap-1">
        <ShellLayoutToggle />
        <ThemePaletteToggle />
        <ThemeToggle />
        {UserMenu ? <UserMenu collapsed /> : null}
      </div>
    );
  }

  return (
    <>
      <Separator />
      <div className="flex justify-between gap-1 p-3">
        {UserMenu ? <UserMenu showLabel /> : null}
        <div className="flex shrink-0 items-center">
          <ShellLayoutToggle />
          <ThemePaletteToggle />
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}

function SidebarContent({
  onNavigate,
  homePath,
  navSections,
}: {
  onNavigate?: () => void;
  homePath: string;
  navSections: AppNavSection[];
}) {
  const { shellContributions } = useAppShellConfig();
  const slotProps = { homePath, onNavigate };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 px-3 pt-1 pb-2">
        <ShellSlotList
          components={shellContributions.sidebarPrimaryAction}
          render={(Component, index) => (
            <Component key={index} {...slotProps} />
          )}
        />
      </div>

      <div className="flex flex-col gap-3 px-3 py-2">
        {navSections.map((section) => (
          <div key={section.label} className="flex flex-col gap-0.5">
            <SidebarSectionLabel>{section.label}</SidebarSectionLabel>
            {section.items.map((item) => (
              <SidebarNavItem
                key={item.path}
                to={item.path}
                end={item.end}
                activePrefix={item.activePrefix}
                icon={item.icon}
                label={item.label}
                itemTitle={item.title}
                onClick={onNavigate}
                badgeKey={item.badgeKey}
              />
            ))}
          </div>
        ))}
      </div>

      {shellContributions.sidebarPanel.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2">
          <ShellSlotList
            components={shellContributions.sidebarPanel}
            render={(Component, index) => (
              <Component key={index} {...slotProps} />
            )}
          />
        </div>
      ) : null}
    </div>
  );
}

function MobileNavDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { sections: navSections } = useFilteredNavSections();
  const { shellContributions } = useAppShellConfig();
  const homePath = useAppHomePath();
  const UserMenu = shellContributions.sidebarUserMenu[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        title="导航"
        className="flex flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="flex-row items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="px-1" asChild>
            <Link to={homePath} onClick={() => onOpenChange(false)}>
              <Logo className="size-8 text-primary" />
              <span className="sr-only">be-water</span>
            </Link>
          </Button>
          <div className="flex items-center">
            <SidebarGlobalActions />
            <Button
              variant="ghost"
              size="icon"
              className={SIDEBAR_ICON_BUTTON}
              title="收起侧边栏"
              onClick={() => onOpenChange(false)}
            >
              <PanelLeftClose />
            </Button>
          </div>
        </SheetHeader>

        <SidebarContent
          onNavigate={() => onOpenChange(false)}
          homePath={homePath}
          navSections={navSections}
        />

        <SheetFooter className="flex-row items-center justify-between">
          {UserMenu ? <UserMenu showLabel /> : null}
          <div className="flex shrink-0 items-center">
            <ThemePaletteToggle />
            <ThemeToggle />
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function MobileTabBar() {
  const location = useLocation();
  const { data: entitlements } = useTenantEntitlements();
  const { hasPermission } = usePermissions();
  const { getMobileTabItems, filterMobileTabPaths, isNavRouteActive } =
    useAppShellConfig();

  const mobileTabItems = useMemo(() => {
    const allItems = getMobileTabItems();
    const visiblePaths = new Set(
      filterMobileTabPaths(
        allItems.map((item) => item.path),
        entitlements,
        hasPermission,
      ),
    );
    return allItems.filter((item) => visiblePaths.has(item.path));
  }, [entitlements, filterMobileTabPaths, getMobileTabItems, hasPermission]);

  const tabClass = (isActive: boolean): string =>
    cn(
      "-mt-px flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 transition-colors",
      isActive
        ? "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
        : "border-transparent text-sidebar-foreground",
    );

  return (
    <nav className="safe-area-inset-bottom fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-border/50 bg-sidebar md:hidden">
      {mobileTabItems.map((item) => {
        const Icon = item.icon;
        const routeActive = isNavRouteActive(location.pathname, {
          path: item.path,
          end: item.end,
          activePrefix: item.activePrefix,
        });

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => tabClass(isActive || routeActive)}
          >
            {({ isActive }) => {
              const active = isActive || routeActive;

              return (
                <>
                  <div className="relative">
                    <Icon
                      className={cn(
                        "size-5",
                        !active && "text-sidebar-foreground/60",
                      )}
                    />
                    {item.badgeKey ? (
                      <MobileTabBadge badgeKey={item.badgeKey} />
                    ) : null}
                  </div>
                  <span className="text-xs">{item.label}</span>
                </>
              );
            }}
          </NavLink>
        );
      })}
    </nav>
  );
}

function MobileTabBadge({
  badgeKey,
}: {
  badgeKey: NonNullable<AppNavItem["badgeKey"]>;
}) {
  const badgeCount = useNavBadgeCount(badgeKey);
  const badgeTitle = getNavBadgeTitle(badgeKey, badgeCount);

  if (badgeCount <= 0) {
    return null;
  }

  return (
    <Badge
      variant="destructive"
      title={badgeTitle}
      className="absolute -top-1.5 -right-2.5 h-4 min-w-4 justify-center px-1 text-[10px]"
    >
      {badgeCount > 99 ? "99+" : badgeCount}
    </Badge>
  );
}

function DesktopSidebar() {
  const [collapsed, setCollapsed] = usePersistState({
    key: "sidebar_collapsed",
    defaultValue: false,
  });
  const { sections: navSections } = useFilteredNavSections();
  const { shellContributions } = useAppShellConfig();
  const homePath = useAppHomePath();

  const navItems = useMemo(
    () => navSections.flatMap((section) => section.items),
    [navSections],
  );

  if (collapsed) {
    return (
      <aside className="hidden w-14 shrink-0 flex-col items-center gap-2 border-r bg-sidebar py-3 text-sidebar-foreground md:flex">
        <Button
          variant="ghost"
          size="icon"
          className={SIDEBAR_ICON_BUTTON}
          title="展开侧边栏"
          onClick={() => setCollapsed(false)}
        >
          <PanelLeft />
        </Button>
        <SidebarGlobalActions orientation="vertical" />
        <ShellSlotList
          components={shellContributions.sidebarPrimaryAction}
          render={(Component, index) => (
            <Component key={index} homePath={homePath} collapsed />
          )}
        />
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.path}
            to={item.path}
            end={item.end}
            activePrefix={item.activePrefix}
            icon={item.icon}
            label={item.label}
            itemTitle={item.title}
            collapsed
            badgeKey={item.badgeKey}
          />
        ))}
        <SidebarFooter collapsed />
      </aside>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center justify-between p-3">
        <Link to={homePath} title="be-water">
          <Logo className="size-12 text-primary" />
          <span className="sr-only">be-water</span>
        </Link>
        <SidebarGlobalActions className="ml-auto" />
        <Button
          variant="ghost"
          size="icon"
          className={SIDEBAR_ICON_BUTTON}
          title="收起侧边栏"
          onClick={() => setCollapsed(true)}
        >
          <PanelLeftClose />
        </Button>
      </div>
      <SidebarContent homePath={homePath} navSections={navSections} />
      <SidebarFooter />
    </aside>
  );
}

export { DesktopSidebar, MobileNavDrawer, MobileTabBar };
