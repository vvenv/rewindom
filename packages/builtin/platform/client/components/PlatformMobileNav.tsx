import { useState } from "react";

import { cn } from "@be-water/ui/utils";
import { NavLink, useLocation } from "react-router";

import {
  isNavChildActive,
  isNavGroupActive,
  usePlatformNavConfig,
  type PlatformNavGroup,
} from "./platform-nav-config.js";
import { PlatformNavChildLabel } from "./PlatformNavChildLabel.js";

export function PlatformMobileNav() {
  const location = useLocation();
  const { platformNavEntries } = usePlatformNavConfig();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const toggleGroup = (key: string) => {
    setExpandedGroup((prev) => (prev === key ? null : key));
  };

  const expandedGroupEntry = platformNavEntries.find(
    (entry): entry is PlatformNavGroup =>
      entry.type === "group" && entry.key === expandedGroup,
  );

  return (
    <>
      <nav className="safe-area-inset-bottom fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-border/50 bg-sidebar sm:hidden">
        {platformNavEntries.map((entry) => {
          if (entry.type === "group") {
            const isActive =
              expandedGroup === entry.key ||
              isNavGroupActive(location.pathname, entry, location.search);
            const Icon = entry.icon;
            return (
              <button
                key={entry.key}
                onClick={() => toggleGroup(entry.key)}
                className={cn(
                  "-mt-px flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 transition-colors",
                  isActive
                    ? "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "border-transparent text-sidebar-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    !isActive && "text-sidebar-foreground/60",
                  )}
                />
                <span className="text-xs">{entry.label}</span>
              </button>
            );
          }

          const { to, label, icon: Icon, end } = entry;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "-mt-px flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 transition-colors",
                  isActive
                    ? "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "border-transparent text-sidebar-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      !isActive && "text-sidebar-foreground/60",
                    )}
                  />
                  <span className="text-xs">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {expandedGroupEntry ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
            onClick={() => setExpandedGroup(null)}
          />
          <div className="fixed inset-x-0 bottom-16 z-50 rounded-t-2xl bg-sidebar shadow-2xl animate-in slide-in-from-bottom-10 duration-200 sm:hidden">
            <div className="flex items-center justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-sidebar-foreground/20" />
            </div>
            <div className="border-b border-border/50 px-4 py-2">
              <span className="text-sidebar-foreground/60">
                {expandedGroupEntry.label}
              </span>
            </div>
            <div className="flex max-h-[50vh] flex-col overflow-y-auto py-1">
              {expandedGroupEntry.children.map(({ to, label, end, badgeKey }, index) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setExpandedGroup(null)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center px-4 py-3.5 transition-colors",
                      index !== expandedGroupEntry.children.length - 1 &&
                        "border-b border-border/30",
                      isActive
                        ? "bg-primary/5 text-primary"
                        : "text-sidebar-foreground hover:bg-background/50 hover:text-foreground",
                    )
                  }
                >
                  <PlatformNavChildLabel label={label} badgeKey={badgeKey} />
                  {isNavChildActive(
                    location.pathname,
                    to,
                    end,
                    location.search,
                  ) ? (
                    <span className="ml-auto size-1.5 rounded-full bg-primary" />
                  ) : null}
                </NavLink>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
