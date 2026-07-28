import { useMemo, type ReactNode } from "react";

import {
  Logo,
  OVERFLOW_MEASURE_ROW_CLASS,
  ShellLayoutToggle,
  ThemePaletteToggle,
  ThemeToggle,
  useAppHomePath,
  useNavBadgeCount,
  useOverflowRow,
  type AppNavItem,
  type AppNavSection,
} from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { Separator } from "@be-water/ui/separator";
import { cn } from "@be-water/ui/utils";
import { ChevronDown } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";

import { useAppShellConfig } from "../contexts/app-shell-context.js";
import {
  getNavBadgeTitle,
  useFilteredNavSections,
} from "../hooks/useFilteredNavSections.js";

import { ShellSlotList } from "./ShellSlotList.js";

/** 相邻导航项的间距（px），必须与容器的 `gap-1` 一致，供溢出测量换算。 */
const NAV_GAP_PX = 4;

/**
 * 摊平后的一项：`sectionLabel` 非空表示这里是新 section 的起点。
 * 顶栏没有纵向空间摆 section 标题，改用一道竖分隔线表示分组；
 * section 名字留给「更多」下拉里做分组标签。
 */
interface TopBarNavEntry {
  item: AppNavItem;
  sectionLabel: string;
  startsSection: boolean;
}

function flattenSections(sections: AppNavSection[]): TopBarNavEntry[] {
  return sections.flatMap((section, sectionIndex) =>
    section.items.map((item, itemIndex) => ({
      item,
      sectionLabel: section.label,
      startsSection: itemIndex === 0 && sectionIndex > 0,
    })),
  );
}

function NavBadgeCount({
  badgeKey,
  className,
}: {
  badgeKey: AppNavItem["badgeKey"];
  className?: string;
}) {
  const badgeCount = useNavBadgeCount(badgeKey);

  if (badgeCount <= 0) return null;

  return (
    <Badge
      variant="destructive"
      title={getNavBadgeTitle(badgeKey, badgeCount)}
      className={cn("h-4 min-w-4 justify-center px-1 text-[10px]", className)}
    >
      {badgeCount > 99 ? "99+" : badgeCount}
    </Badge>
  );
}

/**
 * 顶栏导航项。与侧边栏版的区别只在朝向：这里用背景块表示激活态，
 * 不用左侧竖条（横向排布时左边框读起来像分隔线）。
 */
function TopBarNavItem({ item }: { item: AppNavItem }) {
  const location = useLocation();
  const { isNavRouteActive } = useAppShellConfig();
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.end}
      title={item.title}
      className={({ isActive }) => {
        const active =
          isActive ||
          isNavRouteActive(location.pathname, {
            path: item.path,
            end: item.end,
            activePrefix: item.activePrefix,
          });

        return cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-sidebar-foreground transition-colors outline-none select-none",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-accent text-sidebar-accent-foreground",
        );
      }}
    >
      <Icon className="size-4 shrink-0" />
      <span className="whitespace-nowrap">{item.label}</span>
      <NavBadgeCount badgeKey={item.badgeKey} />
    </NavLink>
  );
}

/** 放不下的导航项：按 section 分组塞进下拉。 */
function OverflowNavMenu({ entries }: { entries: TopBarNavEntry[] }) {
  const location = useLocation();
  const { isNavRouteActive } = useAppShellConfig();

  const groups = useMemo(() => {
    const bySection = new Map<string, AppNavItem[]>();
    for (const entry of entries) {
      const list = bySection.get(entry.sectionLabel) ?? [];
      list.push(entry.item);
      bySection.set(entry.sectionLabel, list);
    }
    return [...bySection.entries()];
  }, [entries]);

  const hasActive = entries.some((entry) =>
    isNavRouteActive(location.pathname, {
      path: entry.item.path,
      end: entry.item.end,
      activePrefix: entry.item.activePrefix,
    }),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            hasActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          更多
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" collisionPadding={8} className="w-52">
        {groups.map(([sectionLabel, items], groupIndex) => (
          <div key={sectionLabel}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {sectionLabel}
            </DropdownMenuLabel>
            {items.map((item) => (
              <DropdownMenuItem key={item.path} asChild>
                <NavLink to={item.path} end={item.end} title={item.title}>
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <NavBadgeCount badgeKey={item.badgeKey} />
                </NavLink>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavEntry({ entry }: { entry: TopBarNavEntry }) {
  return (
    <>
      {entry.startsSection ? (
        <Separator
          orientation="vertical"
          className="mx-1 !h-5 bg-sidebar-border"
        />
      ) : null}
      <TopBarNavItem item={entry.item} />
    </>
  );
}

/**
 * 上下布局的顶部导航栏（仅 md+ 渲染，窄屏走移动端外壳）。
 *
 * 导航区宽度不够时，尾部若干项自动收进「更多」下拉——见 `useOverflowRow`。
 * 因此这里既不会横向溢出，也不需要横向滚动，下游加到几十个菜单同样成立。
 */
export function TopBar(): ReactNode {
  const { sections } = useFilteredNavSections();
  const { shellContributions } = useAppShellConfig();
  const homePath = useAppHomePath();
  const UserMenu = shellContributions.sidebarUserMenu[0];

  const entries = useMemo(() => flattenSections(sections), [sections]);
  const { containerRef, measureItemRef, measureOverflowRef, visibleCount } =
    useOverflowRow(entries.length, { gap: NAV_GAP_PX });

  const visible = entries.slice(0, visibleCount);
  const overflow = entries.slice(visibleCount);

  return (
    <header className="hidden h-14 shrink-0 items-center gap-2 border-b bg-sidebar px-3 text-sidebar-foreground md:flex">
      <Link to={homePath} title="be-water" className="shrink-0">
        <Logo className="size-9 text-primary" />
        <span className="sr-only">be-water</span>
      </Link>

      <nav
        ref={containerRef}
        className="relative flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
        aria-label="主导航"
      >
        {visible.map((entry) => (
          <NavEntry key={entry.item.path} entry={entry} />
        ))}
        {overflow.length > 0 ? <OverflowNavMenu entries={overflow} /> : null}

        {/*
          隐藏测量行：渲染全部项，只为量出各项自然宽度。已被收起的项宽度也因此可知，
          容器变宽时能正确放回来——只量可见项的实现会单向收缩、涨不回去。
        */}
        <div className={OVERFLOW_MEASURE_ROW_CLASS} aria-hidden="true">
          {entries.map((entry, index) => (
            <span key={entry.item.path} ref={measureItemRef(index)}>
              <NavEntry entry={entry} />
            </span>
          ))}
          <span ref={measureOverflowRef}>
            <Button variant="ghost" size="sm" className="h-9" tabIndex={-1}>
              更多
              <ChevronDown className="size-3.5" />
            </Button>
          </span>
        </div>
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <ShellSlotList
          components={shellContributions.sidebarPrimaryAction}
          render={(Component, index) => (
            <Component key={index} homePath={homePath} collapsed />
          )}
        />
        <ShellSlotList
          components={shellContributions.sidebarToolbar}
          render={(Component, index) => <Component key={index} />}
        />
        <ShellLayoutToggle menuSide="bottom" menuAlign="end" />
        <ThemePaletteToggle menuSide="bottom" menuAlign="end" />
        <ThemeToggle />
        {UserMenu ? <UserMenu menuSide="bottom" menuAlign="end" /> : null}
      </div>
    </header>
  );
}
