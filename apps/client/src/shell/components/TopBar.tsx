import { useMemo, type ReactNode } from "react";

import {
  Logo,
  OVERFLOW_MEASURE_ROW_CLASS,
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
import { cn } from "@be-water/ui/utils";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router";

import { useAppShellConfig } from "../contexts/app-shell-context.js";
import { useAppHomePath } from "../hooks/useAppHomePath.js";
import {
  getNavBadgeTitle,
  useFilteredNavSections,
} from "../hooks/useFilteredNavSections.js";

import { ShellSlotList } from "./ShellSlotList.js";

/** 相邻导航项的间距（px），必须与容器的 `gap-1` 一致，供溢出测量换算。 */
const NAV_GAP_PX = 4;

/** section 下拉入口与「更多」共用同一套外观，测量行才能量准。 */
const NAV_TRIGGER_CLASS =
  "h-9 shrink-0 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

function NavBadgeCount({
  badgeKey,
  className,
}: {
  badgeKey: AppNavItem["badgeKey"];
  className?: string;
}) {
  const { t } = useTranslation("common");
  const badgeCount = useNavBadgeCount(badgeKey);

  if (badgeCount <= 0) return null;

  return (
    <Badge
      variant="destructive"
      title={getNavBadgeTitle(badgeKey, badgeCount, t)}
      className={cn("h-4 min-w-4 justify-center px-1 text-xs", className)}
    >
      {badgeCount > 99 ? "99+" : badgeCount}
    </Badge>
  );
}

/**
 * section 折叠成下拉后，组内的待办数会被藏起来，所以把组内出现过的 badge
 * 提到入口上。同一 badgeKey 只提一次——它本身就是全局计数，不按项累加。
 */
function SectionBadgeCounts({ items }: { items: AppNavItem[] }) {
  const badgeKeys = useMemo(
    () => [
      ...new Set(
        items.flatMap((item) => (item.badgeKey ? [item.badgeKey] : [])),
      ),
    ],
    [items],
  );

  return badgeKeys.map((badgeKey) => (
    <NavBadgeCount key={badgeKey} badgeKey={badgeKey} />
  ));
}

/** 判定 section 里是否有页面处于激活态——决定下拉入口要不要高亮。 */
function useIsSectionActive(items: AppNavItem[]): boolean {
  const location = useLocation();
  const { isNavRouteActive } = useAppShellConfig();

  return items.some((item) => isNavRouteActive(location.pathname, item));
}

/**
 * 顶栏一级导航项，只用于「组内仅一个页面」的 section——那种情况套下拉纯属多点一次。
 * 与侧边栏版的区别只在朝向：这里用背景块表示激活态，不用左侧竖条
 *（横向排布时左边框读起来像分隔线）。
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
        const active = isActive || isNavRouteActive(location.pathname, item);

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

/** 下拉里的一项。激活态得在这儿自己算：className 传给 Slot 时不能是函数。 */
function NavMenuItem({ item }: { item: AppNavItem }) {
  const location = useLocation();
  const { isNavRouteActive } = useAppShellConfig();
  const active = isNavRouteActive(location.pathname, item);

  return (
    <DropdownMenuItem asChild>
      <NavLink
        to={item.path}
        end={item.end}
        title={item.title}
        className={cn(active && "bg-accent font-medium text-accent-foreground")}
      >
        <item.icon className="size-4 shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        <NavBadgeCount badgeKey={item.badgeKey} />
      </NavLink>
    </DropdownMenuItem>
  );
}

/** 一个 section 一个下拉：入口是组名，组内页面是下拉项。 */
function SectionNavMenu({ section }: { section: AppNavSection }) {
  const active = useIsSectionActive(section.items);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            NAV_TRIGGER_CLASS,
            active && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          {section.label}
          <SectionBadgeCounts items={section.items} />
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" collisionPadding={8} className="w-52">
        {section.items.map((item) => (
          <NavMenuItem key={item.path} item={item} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 顶栏放不下的 section：整组塞进「更多」，组名降级为下拉里的分组标签。 */
function OverflowNavMenu({ sections }: { sections: AppNavSection[] }) {
  const { t } = useTranslation(["shell", "common"]);
  const items = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );
  const hasActive = useIsSectionActive(items);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            NAV_TRIGGER_CLASS,
            hasActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          {t("chrome.more")}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" collisionPadding={8} className="w-52">
        {sections.map((section, sectionIndex) => (
          <div key={section.label}>
            {sectionIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {section.label}
            </DropdownMenuLabel>
            {section.items.map((item) => (
              <NavMenuItem key={item.path} item={item} />
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 一个 section 对应顶栏一格。
 *
 * `measuring` 用于隐藏测量行：那里只需要量宽度，把下拉换成同样外观的静态按钮，
 * 免得给每个 section 再挂一份 Radix 菜单实例（以及重复的 aria 关系）。
 */
function NavEntry({
  section,
  measuring = false,
}: {
  section: AppNavSection;
  measuring?: boolean;
}) {
  const [firstItem] = section.items;

  if (section.items.length === 1 && firstItem) {
    return <TopBarNavItem item={firstItem} />;
  }

  if (measuring) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={NAV_TRIGGER_CLASS}
        tabIndex={-1}
      >
        {section.label}
        <SectionBadgeCounts items={section.items} />
        <ChevronDown className="size-3.5" />
      </Button>
    );
  }

  return <SectionNavMenu section={section} />;
}

/**
 * 上下布局的顶部导航栏（仅 md+ 渲染，窄屏走移动端外壳）。
 *
 * 一级是 section（组内多页时点开下拉，单页时直接就是链接），宽度不够时尾部
 * 若干 section 整组收进「更多」——见 `useOverflowRow`。因此这里既不会横向溢出，
 * 也不需要横向滚动，下游加到几十个菜单同样成立。
 */
export function TopBar(): ReactNode {
  const { t } = useTranslation("shell");
  const { sections } = useFilteredNavSections();
  const { shellContributions } = useAppShellConfig();
  const homePath = useAppHomePath();
  const UserMenu = shellContributions.sidebarUserMenu[0];

  const { containerRef, measureItemRef, measureOverflowRef, visibleCount } =
    useOverflowRow(sections.length, { gap: NAV_GAP_PX });

  const visible = sections.slice(0, visibleCount);
  const overflow = sections.slice(visibleCount);

  return (
    <header className="hidden h-14 shrink-0 items-center gap-2 border-b bg-sidebar px-3 text-sidebar-foreground md:flex">
      <Link to={homePath} title="be-water" className="shrink-0">
        <Logo className="size-9 text-primary" />
        <span className="sr-only">be-water</span>
      </Link>

      <nav
        ref={containerRef}
        className="relative flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
        aria-label={t("chrome.mainNav")}
      >
        {visible.map((section) => (
          <NavEntry key={section.label} section={section} />
        ))}
        {overflow.length > 0 ? <OverflowNavMenu sections={overflow} /> : null}

        {/*
          隐藏测量行：渲染全部项，只为量出各项自然宽度。已被收起的项宽度也因此可知，
          容器变宽时能正确放回来——只量可见项的实现会单向收缩、涨不回去。
        */}
        <div className={OVERFLOW_MEASURE_ROW_CLASS} aria-hidden="true">
          {sections.map((section, index) => (
            <span key={section.label} ref={measureItemRef(index)}>
              <NavEntry section={section} measuring />
            </span>
          ))}
          <span ref={measureOverflowRef}>
            <Button variant="ghost" size="sm" className="h-9" tabIndex={-1}>
              {t("chrome.more")}
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
        {UserMenu ? <UserMenu menuSide="bottom" menuAlign="end" /> : null}
      </div>
    </header>
  );
}
