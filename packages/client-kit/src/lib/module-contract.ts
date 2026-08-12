import type { ComponentType, LazyExoticComponent, ReactNode } from "react";

import {
  type AppLocale,
  type ModuleManifestBase,
  type Permission,
  type TenantFeatureKey,
} from "@be-water/shared";


import type { AppNavSection } from "./app-nav-types.js";
import type { PlatformNavContribution } from "./platform-nav-types.js";
import type { LucideIcon } from "lucide-react";

/**
 * 模块贡献的 i18next 文案包。
 *
 * 文件放在 `packages/builtin/<id>/client/locales/{zh-CN,en}.json`，
 * 由组装层 `registerI18nBundles(collectClientI18nBundles(...))` 注册。
 * `client-kit` 只保留 `common` / `shell`。
 */
export interface ClientI18nBundle {
  /** i18next namespace，通常等于 module id（如 `notes`、`background-job`）。 */
  ns: string;
  resources: Partial<Record<AppLocale, Record<string, unknown>>>;
}


/**
 * 工作台（`/dashboard`）卡片：由**拥有数据的模块自己声明**，`dashboard` 模块只提供
 * 栅格、可见性过滤与错误隔离，不 import 任何业务组件。
 *
 * `component` 用 `lazy()` 包一层——工作台是登录落地页，卡片按需加载才不会把各业务
 * 模块的代码全塞进首屏 chunk。
 */
export interface DashboardWidget {
  /**
   * 全局唯一，约定 `<moduleId>.<name>`；用作 React key、重复声明的去重依据，
   * 以及**用户偏好的持久化键**——改 id 等于让老用户的显隐/排序配置对不上，
   * 会退回默认布局，因此 id 一经发布不要再改。
   */
  id: string;
  /**
   * 配置面板里这张卡片的名称，用 `namespace:key`（与导航项同口径），
   * 由面板在渲染时解析。禁止在模块加载时 `t()`——那会锁死首屏语言。
   *
   * 卡片自身的标题仍由卡片组件自己渲染，这里只服务于「显示/隐藏 + 排序」列表：
   * 卡片被隐藏时组件根本不挂载，面板拿不到它的标题。
   */
  title: string;
  /** 配置面板里的副标题，同为 `namespace:key`。 */
  description?: string;
  /** 配置面板列表项的图标，通常与该模块导航项同一个。 */
  icon?: LucideIcon;
  component: ComponentType;
  /** 桌面端栅格跨度：`1` 占一列，`2` 横跨两列。默认 `1`。 */
  span?: 1 | 2;
  /**
   * 默认顺序，升序，默认 100；相同 order 按 `ENABLED_CLIENT_MODULES` 的注册顺序。
   * 用户在工作台配置面板里自定义排序后，这里只决定「用户还没排过的卡片」落在哪。
   */
  order?: number;
  /** 租户未开通该模块时不渲染（与导航项同义）。 */
  tenantModule?: string;
  tenantFeature?: TenantFeatureKey;
  /** 命中任一权限才渲染（与导航项同义）。 */
  anyPermission?: readonly Permission[];
}

export interface ClientRouteDefinition {
  path: string;
  element: LazyExoticComponent<ComponentType>;
  permission?: Permission | Permission[];
  tenantFeature?: TenantFeatureKey;
  children?: ClientRouteDefinition[];
}

export interface AppMobileHeaderBack {
  to: string;
  label: string;
}

export interface AppMobileHeaderState {
  title: string;
  back?: AppMobileHeaderBack;
}

export interface MobileHeaderRouteDefinition {
  match: (pathname: string) => boolean;
  resolve: (pathname: string) => AppMobileHeaderState;
}

export interface SidebarSlotProps {
  homePath: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}

export interface SidebarUserMenuSlotProps {
  collapsed?: boolean;
  showLabel?: boolean;
  /** 外壳告知该 widget 所处位置，决定下拉朝哪边展开（侧边栏在左下、顶栏在右上）。 */
  menuSide?: "top" | "bottom" | "left" | "right";
  menuAlign?: "start" | "center" | "end";
}

export interface AuthLoginHeroProps {
  variant: "desktop" | "compact";
}

export interface ClientShellContributions {
  /** 登录页左侧/移动端 Hero；未提供时使用壳层默认中性文案。 */
  authLoginHero?: ComponentType<AuthLoginHeroProps>;
  shellProviders?: Array<ComponentType<{ children: ReactNode }>>;
  /**
   * 包裹**公开路由树**的 Provider（`renderPublicRoutes` 的那一批）。
   *
   * `shellProviders` 只挂在 `AppLayout` 与平台外壳里，官网 / 租户站点前台拿不到，
   * 所以站点会员会话这类「登录前就要有」的上下文必须走这里。
   * 公开页 SSR 首屏不跑客户端 Provider；会员会话等能力在 SPA 接管后生效。
   */
  publicProviders?: Array<ComponentType<{ children: ReactNode }>>;
  sidebarToolbar?: ComponentType;
  sidebarPrimaryAction?: ComponentType<SidebarSlotProps>;
  sidebarPanel?: ComponentType<SidebarSlotProps>;
  sidebarUserMenu?: ComponentType<SidebarUserMenuSlotProps>;
  mobileHeaderTrailing?: ComponentType;
  navBadge?: ComponentType;
  /** Platform console sidebar badge contributor (e.g. pending review count). */
  platformNavBadge?: ComponentType;
  useImpersonationActive?: () => boolean;
  mobileHeaderRoutes?: readonly MobileHeaderRouteDefinition[];
}

export interface ClientAppModule extends ModuleManifestBase {
  client?: {
    routes?: ClientRouteDefinition[];
    /**
     * 完全公开的路由：无任何守卫，登录与未登录都按原样渲染。
     *
     * 与 `renderGuestRoutes` 的区别是后者套 `GuestOnlyRoute`——已登录会被重定向走，
     * 那是登录/注册页的语义。官网、文档、定价这类页面必须对两种身份都可见，
     * 且**必须能在没有任何 App Provider 的环境下渲染**（构建期预渲染就是这么跑的）：
     * 不要用 `useAuth`（无 Provider 会抛）、`api` 或其他依赖运行时上下文的东西，
     * 需要登录态请用 `useOptionalAuth`。
     */
    renderPublicRoutes?: () => ReactNode;
    renderGuestRoutes?: () => ReactNode;
    renderTenantRoutes?: () => ReactNode;
    renderRoutes?: () => ReactNode;
    renderSuperUserRoutes?: () => ReactNode;
    renderPlatformRoutes?: () => ReactNode;
    nav?: AppNavSection[];
    /** 本模块贡献给 `/dashboard` 工作台的卡片。 */
    dashboardWidgets?: readonly DashboardWidget[];
    platformNav?: readonly PlatformNavContribution[];
    mobileTabPaths?: readonly string[];
    shell?: ClientShellContributions;
    /** 本模块 UI 文案；未声明则无独立 namespace。 */
    i18n?: ClientI18nBundle;
  };
}

/** 从启用模块列表收集文案包（组装层在 `setupI18n` 前注册）。 */
export function collectClientI18nBundles(
  modules: readonly ClientAppModule[],
): ClientI18nBundle[] {
  const bundles: ClientI18nBundle[] = [];
  for (const module of modules) {
    if (module.client?.i18n) {
      bundles.push(module.client.i18n);
    }
  }
  return bundles;
}
