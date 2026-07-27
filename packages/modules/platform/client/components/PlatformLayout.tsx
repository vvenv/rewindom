import { useEffect, useState } from "react";

import { usePersistState, AppVersion , Logo , Wordmark , ThemeToggle ,
  type PlatformNavGroup } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { cn } from "@be-water/ui/utils";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import { TaskProvider } from "../../../background-job/client/contexts/TaskContext.js";
import {
  activityCenterSlot,
  userAvatarSlot,
} from "../shell/platform-widget-slots.js";

import {
  isNavChildActive,
  isNavGroupActive,
  usePlatformNavConfig,
} from "./platform-nav-config.js";
import { PlatformMobileNav } from "./PlatformMobileNav.js";
import { PlatformNavChildLabel } from "./PlatformNavChildLabel.js";

function PlatformNavGroupItem({
  group,
  collapsed,
  expanded,
  onToggle,
}: {
  group: PlatformNavGroup;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const groupActive = isNavGroupActive(
    location.pathname,
    group,
    location.search,
  );
  const Icon = group.icon;

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title={group.label}
            className={cn(
              "flex h-10 w-full items-center border-l-2 transition-colors",
              collapsed ? "justify-center px-0" : "px-4",
              groupActive
                ? "border-primary bg-sidebar-accent text-sidebar-accent-foreground"
                : "border-transparent text-sidebar-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="min-w-40">
          {group.children.map(({ to, label, end, badgeKey }) => (
            <DropdownMenuItem key={to} asChild>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(isActive && "bg-accent font-medium")
                }
              >
                <PlatformNavChildLabel label={label} badgeKey={badgeKey} />
              </NavLink>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex h-10 w-full items-center gap-3 border-l-2 transition-colors",
          collapsed ? "justify-center px-0" : "px-4",
          groupActive
            ? "border-primary bg-sidebar-accent/50 text-sidebar-accent-foreground"
            : "border-transparent text-sidebar-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded ? (
        <div className="flex flex-col pb-1">
          {group.children.map(({ to, label, end, badgeKey }) => {
            const active = isNavChildActive(
              location.pathname,
              to,
              end,
              location.search,
            );
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={cn(
                  "flex h-9 min-w-0 items-center border-l-2 pl-9 pr-4 text-sm transition-colors",
                  active
                    ? "border-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "border-transparent text-sidebar-foreground/80 hover:bg-muted hover:text-foreground",
                )}
              >
                <PlatformNavChildLabel label={label} badgeKey={badgeKey} />
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function PlatformLayout() {
  const location = useLocation();
  const { platformNavEntries, getPlatformPageTitle } = usePlatformNavConfig();
  const ActivityCenter = activityCenterSlot.useSlot();
  const UserAvatar = userAvatarSlot.useSlot();
  const [collapsed, setCollapsed] = usePersistState({
    key: "sidebar:collapsed",
    defaultValue: false,
    serialize: (v) => String(v),
    deserialize: (v) => v === "true",
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const entry of platformNavEntries) {
        if (
          entry.type === "group" &&
          isNavGroupActive(location.pathname, entry, location.search)
        ) {
          initial[entry.key] = true;
        }
      }
      return initial;
    },
  );

  const currentTitle = getPlatformPageTitle(location.pathname, location.search);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    for (const entry of platformNavEntries) {
      if (
        entry.type === "group" &&
        isNavGroupActive(location.pathname, entry, location.search)
      ) {
        setExpandedGroups((prev) =>
          prev[entry.key] ? prev : { ...prev, [entry.key]: true },
        );
      }
    }
  }, [location.pathname, location.search]);

  return (
    <TaskProvider>
      <div className="flex h-svh overflow-hidden bg-background">
        <aside
          className={cn(
            "hidden sm:flex shrink-0 bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300 ease-in-out",
            collapsed ? "w-14" : "w-36",
          )}
        >
          <Link
            to="/platform"
            className={cn(
              "h-14 flex items-center border-b border-border/50 overflow-hidden",
              collapsed ? "justify-center px-0" : "px-3.5",
            )}
            title="首页"
          >
            {collapsed ? (
              <Logo className="size-6 shrink-0" />
            ) : (
              <Wordmark className="h-4 w-auto max-w-full shrink-0 text-foreground" />
            )}
          </Link>

          <nav className="flex flex-col flex-1 overflow-y-auto py-2">
            {platformNavEntries.map((entry) => {
              if (entry.type === "group") {
                return (
                  <PlatformNavGroupItem
                    key={entry.key}
                    group={entry}
                    collapsed={collapsed}
                    expanded={expandedGroups[entry.key] ?? false}
                    onToggle={() => toggleGroup(entry.key)}
                  />
                );
              }

              const { to, label, icon: Icon, end } = entry;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center h-10 transition-colors border-l-2 gap-3",
                      collapsed ? "justify-center px-0" : "px-4",
                      isActive
                        ? "border-primary bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground border-transparent hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed ? (
                    <span className="truncate">{label}</span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>

          {!collapsed && (
            <div className="border-t border-border/50 px-4 py-3">
              <AppVersion />
            </div>
          )}
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 shrink-0 border-b border-border bg-card flex items-center gap-2 px-3 sm:gap-3 sm:px-4">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </Button>
            <Link to="/platform" className="sm:hidden" title="首页">
              <Logo className="size-6 shrink-0" />
            </Link>
            <h1 className="flex-1 min-w-0 truncate font-medium text-foreground">
              {currentTitle}
            </h1>
            {ActivityCenter && <ActivityCenter />}
            <ThemeToggle />
            {UserAvatar && <UserAvatar />}
          </header>
          <main className="flex-1 overflow-y-auto p-3 pb-20 sm:p-6">
            <Outlet />
          </main>
        </div>

        <PlatformMobileNav />
      </div>
    </TaskProvider>
  );
}
