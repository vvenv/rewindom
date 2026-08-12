import { useCallback, useMemo } from "react";

import {
  BrandMark,
  resolveNavLabel,
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
import {
  ChevronRight,
  PanelLeft,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router";

import { useAppShellConfig } from "../contexts/app-shell-context.js";
import { useAppHomePath } from "../hooks/useAppHomePath.js";
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
  const { t } = useTranslation("common");
  const { isNavRouteActive } = useAppShellConfig();
  const badgeCount = useNavBadgeCount(badgeKey);
  const resolvedBadgeTitle =
    badgeTitle ?? getNavBadgeTitle(badgeKey, badgeCount, t);

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
            "h-4 min-w-4 justify-center px-1 text-xs",
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

/**
 * 各分组（section）的折叠状态：按 section.label 存取，持久化到 localStorage。
 *
 * 仅桌面侧栏启用——移动端抽屉为临时展开，折叠藏入口反而不友好；`SidebarNavSections`
 * 默认 `collapsedSections = {}`，不传即不折叠任何分组（移动端走这条路径）。
 */
const NAV_SECTION_COLLAPSED_KEY = "sidebar_nav_sections_collapsed";

/**
 * 默认收起的分组（按翻译前的 `labelKey` 匹配，跨语言稳定）。底部管理类分组
 * （系统管理 / 系统监控）日常用得少，默认收起减负；用户手动展开后由持久化值覆盖。
 */
const DEFAULT_COLLAPSED_LABEL_KEYS = new Set([
  "common:nav.systemManagement",
  "common:nav.systemMonitoring",
]);

function useNavSectionCollapse() {
  const [collapsedSections, setCollapsedSections] = usePersistState<
    Record<string, boolean>
  >({
    key: NAV_SECTION_COLLAPSED_KEY,
    defaultValue: {},
  });

  const toggleSection = useCallback(
    (label: string) => {
      // 基于「当前实际折叠态」翻转：未记录时取默认值，否则取持久化值。
      // 否则默认收起的分组首次点击会 `!undefined`=true 仍收起，点不动。
      setCollapsedSections((prev) => ({
        ...prev,
        [label]: !(prev[label] ?? DEFAULT_COLLAPSED_LABEL_KEYS.has(label)),
      }));
    },
    [setCollapsedSections],
  );

  return { collapsedSections, toggleSection };
}

/** 当前路由是否命中分组内任一页面——命中则该分组强制展开，避免折叠态下迷路。 */
function useSectionHasActiveItem(items: AppNavItem[]): boolean {
  const location = useLocation();
  const { isNavRouteActive } = useAppShellConfig();
  return useMemo(
    () => items.some((item) => isNavRouteActive(location.pathname, item)),
    [items, isNavRouteActive, location.pathname],
  );
}

function SidebarSectionHeader({
  label,
  collapsed,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="flex w-full items-center gap-1 rounded-md px-2 pb-1 pt-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <ChevronRight
        className={cn(
          "size-3.5 shrink-0 transition-transform",
          !collapsed && "rotate-90",
        )}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

/**
 * 一个分组的渲染：单项分组直接平铺（折叠后只剩标题无法跳转，体验差，与 TopBar
 * 单项不下拉一致）；多项分组的标题可点击折叠，当前路由命中时强制展开。
 *
 * 折叠状态按 `labelKey`（翻译前的 i18n key，跨语言稳定）存取：用户手动操作过的
 * 取持久化值，否则取 `DEFAULT_COLLAPSED_LABEL_KEYS` 的默认值。移动端不传
 * `onToggleSection`，此时不启用折叠（全展开）。
 */
function SidebarNavSection({
  section,
  onNavigate,
  collapsedSections,
  onToggleSection,
}: {
  section: AppNavSection;
  onNavigate?: () => void;
  collapsedSections: Record<string, boolean>;
  onToggleSection?: (label: string) => void;
}) {
  const sectionKey = section.labelKey ?? section.label;
  const collapsible = onToggleSection !== undefined && section.items.length > 1;
  const hasActive = useSectionHasActiveItem(section.items);
  const userOverride = collapsedSections[sectionKey];
  const isCollapsed =
    collapsible &&
    (userOverride ?? DEFAULT_COLLAPSED_LABEL_KEYS.has(sectionKey)) &&
    !hasActive;

  return (
    <div className="flex flex-col gap-0.5">
      {collapsible ? (
        <SidebarSectionHeader
          label={section.label}
          collapsed={isCollapsed}
          onToggle={() => onToggleSection?.(sectionKey)}
        />
      ) : (
        <SidebarSectionLabel>{section.label}</SidebarSectionLabel>
      )}
      {!isCollapsed
        ? section.items.map((item) => (
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
          ))
        : null}
    </div>
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

function SidebarNavSections({
  sections,
  onNavigate,
  collapsed = false,
  collapsedSections,
  onToggleSection,
}: {
  sections: AppNavSection[];
  onNavigate?: () => void;
  collapsed?: boolean;
  collapsedSections?: Record<string, boolean>;
  onToggleSection?: (label: string) => void;
}) {
  if (sections.length === 0) {
    return null;
  }

  // 窄模式（整体侧栏折叠）：图标平铺，无分组标题可点，不参与分组折叠。
  if (collapsed) {
    return (
      <>
        {sections.flatMap((section) =>
          section.items.map((item) => (
            <SidebarNavItem
              key={item.path}
              to={item.path}
              end={item.end}
              activePrefix={item.activePrefix}
              icon={item.icon}
              label={item.label}
              itemTitle={item.title}
              onClick={onNavigate}
              collapsed
              badgeKey={item.badgeKey}
            />
          )),
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-3 py-2">
      {sections.map((section) => (
        <SidebarNavSection
          key={section.label}
          section={section}
          onNavigate={onNavigate}
          collapsedSections={collapsedSections ?? {}}
          onToggleSection={onToggleSection}
        />
      ))}
    </div>
  );
}

function SidebarFooter({
  collapsed = false,
  endSections = [],
  onNavigate,
  collapsedSections,
  onToggleSection,
}: {
  collapsed?: boolean;
  endSections?: AppNavSection[];
  onNavigate?: () => void;
  collapsedSections?: Record<string, boolean>;
  onToggleSection?: (label: string) => void;
}) {
  const { shellContributions } = useAppShellConfig();
  const UserMenu = shellContributions.sidebarUserMenu[0];

  if (collapsed) {
    return (
      <div className="mt-auto flex flex-col items-center gap-1">
        <SidebarNavSections
          sections={endSections}
          onNavigate={onNavigate}
          collapsed
        />
        {UserMenu ? <UserMenu collapsed /> : null}
      </div>
    );
  }

  return (
    <div className="mt-auto flex flex-col">
      {endSections.length > 0 ? (
        <SidebarNavSections
          sections={endSections}
          onNavigate={onNavigate}
          collapsedSections={collapsedSections}
          onToggleSection={onToggleSection}
        />
      ) : null}
      <Separator />
      <div className="flex p-3">{UserMenu ? <UserMenu showLabel /> : null}</div>
    </div>
  );
}

function SidebarContent({
  onNavigate,
  homePath,
  navSections,
  collapsedSections,
  onToggleSection,
}: {
  onNavigate?: () => void;
  homePath: string;
  navSections: AppNavSection[];
  collapsedSections?: Record<string, boolean>;
  onToggleSection?: (label: string) => void;
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarNavSections
          sections={navSections}
          onNavigate={onNavigate}
          collapsedSections={collapsedSections}
          onToggleSection={onToggleSection}
        />
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

function ShellBrandMark({ className }: { className?: string }) {
  // 中台外壳一律用产品 Logo：品牌是站点的资产，只作用于官网
  return <BrandMark className={className} alt="Logo" />;
}

function MobileNavDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("shell");
  const { mainSections, endSections } = useFilteredNavSections();
  const { shellContributions } = useAppShellConfig();
  const homePath = useAppHomePath();
  const UserMenu = shellContributions.sidebarUserMenu[0];
  const closeNav = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        title={t("chrome.nav")}
        className="flex flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="flex-row items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="px-1" asChild>
            <Link to={homePath} onClick={closeNav}>
              <ShellBrandMark className="size-8 text-primary" />
              <span className="sr-only">be-water</span>
            </Link>
          </Button>
          <div className="flex items-center">
            <SidebarGlobalActions />
            <Button
              variant="ghost"
              size="icon"
              className={SIDEBAR_ICON_BUTTON}
              title={t("chrome.collapseSidebar")}
              onClick={closeNav}
            >
              <PanelLeftClose />
            </Button>
          </div>
        </SheetHeader>

        <SidebarContent
          onNavigate={closeNav}
          homePath={homePath}
          navSections={mainSections}
        />

        <div className="mt-auto flex flex-col">
          <SidebarNavSections sections={endSections} onNavigate={closeNav} />
          <SheetFooter className="flex-row items-center">
            {UserMenu ? <UserMenu showLabel /> : null}
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileTabBar() {
  const location = useLocation();
  const { t } = useTranslation(["common", "dashboard", "note", "todo"]);
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
    return allItems
      .filter((item) => visiblePaths.has(item.path))
      .map((item) => ({
        ...item,
        label: resolveNavLabel(item.label, t),
      }));
  }, [entitlements, filterMobileTabPaths, getMobileTabItems, hasPermission, t]);

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
  const { t } = useTranslation("common");
  const badgeCount = useNavBadgeCount(badgeKey);
  const badgeTitle = getNavBadgeTitle(badgeKey, badgeCount, t);

  if (badgeCount <= 0) {
    return null;
  }

  return (
    <Badge
      variant="destructive"
      title={badgeTitle}
      className="absolute -top-1.5 -right-2.5 h-4 min-w-4 justify-center px-1 text-xs"
    >
      {badgeCount > 99 ? "99+" : badgeCount}
    </Badge>
  );
}

function DesktopSidebar() {
  const { t } = useTranslation("shell");
  const [collapsed, setCollapsed] = usePersistState({
    key: "sidebar_collapsed",
    defaultValue: false,
  });
  const { mainSections, endSections } = useFilteredNavSections();
  const { shellContributions } = useAppShellConfig();
  const homePath = useAppHomePath();
  const { collapsedSections, toggleSection } = useNavSectionCollapse();

  if (collapsed) {
    return (
      <aside className="hidden w-14 shrink-0 flex-col items-center gap-2 border-r bg-sidebar py-3 text-sidebar-foreground md:flex">
        <Button
          variant="ghost"
          size="icon"
          className={SIDEBAR_ICON_BUTTON}
          title={t("chrome.expandSidebar")}
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
        <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto">
          <SidebarNavSections sections={mainSections} collapsed />
        </div>
        <SidebarFooter collapsed endSections={endSections} />
      </aside>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center justify-between p-3">
        <Link to={homePath} title="be-water">
          <ShellBrandMark className="size-12 text-primary" />
          <span className="sr-only">be-water</span>
        </Link>
        <SidebarGlobalActions className="ml-auto" />
        <Button
          variant="ghost"
          size="icon"
          className={SIDEBAR_ICON_BUTTON}
          title={t("chrome.collapseSidebar")}
          onClick={() => setCollapsed(true)}
        >
          <PanelLeftClose />
        </Button>
      </div>
      <SidebarContent
        homePath={homePath}
        navSections={mainSections}
        collapsedSections={collapsedSections}
        onToggleSection={toggleSection}
      />
      <SidebarFooter
        endSections={endSections}
        collapsedSections={collapsedSections}
        onToggleSection={toggleSection}
      />
    </aside>
  );
}

export { DesktopSidebar, MobileNavDrawer, MobileTabBar };
