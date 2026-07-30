# module-dashboard

## 用途

租户登录后的默认首页 `/dashboard`（工作台）。本模块**只提供骨架**：栅格布局、可见性过滤、
单卡片错误隔离；卡片内容由各业务模块通过 `client.dashboardWidgets` 自己贡献，
dashboard 不 import 任何业务组件。

## 面划分

| 面     | 路由         | 目录             | 所需权限                 |
| ------ | ------------ | ---------------- | ------------------------ |
| 租户侧 | `/dashboard` | `client/tenant/` | 无（登录即可访问，见下） |

纯前端模块，没有 server 面，也没有 `schema.prisma`。

## 为什么不加租户开关 / 权限

`/dashboard` 是登录落地页（`apps/client/src/home-path-candidates.ts` 的第一候选）。
一旦它可被平台关闭或需要某个权限，租户登录后就可能无处可去。因此：

- 路由不套 `TenantModuleRoute` / `PermissionRoute`
- manifest 不声明 `tenantEntitlements`
- 收窄发生在**卡片**粒度：`DashboardWidget` 的 `tenantModule` / `tenantFeature` / `anyPermission`

## 落地页链路

| 入口             | 位置                                                            | 行为                |
| ---------------- | --------------------------------------------------------------- | ------------------- |
| 登录             | `apps/client/src/shell/pages/login.tsx`                         | 租户用户 → `/app`   |
| 注册（自动登录） | `apps/client/src/shell/pages/register.tsx`                      | → `/app`            |
| 已登录访问登录页 | `shell/components/GuestOnlyRoute.tsx`                           | → `/app`            |
| 平台代登录       | `modules/platform/client/components/TenantImpersonateSheet.tsx` | 整页跳 `/app`       |
| 未匹配路由       | `shell/components/AppNotFoundRedirect.tsx`                      | → `AppHomeRedirect` |

`/app` 是稳定入口，`AppHomeRedirect` 按 `HOME_PATH_CANDIDATES` 解析出真实首页 →
默认落到 `/dashboard`。产品仓要换默认首页，只改 `home-path-candidates.ts`，
不必动登录页与代登录逻辑。

## 贡献一张卡片（扩展点）

在业务模块里声明，无需改 dashboard 模块：

```ts
// packages/modules/<id>/client/tenant/dashboard-widgets.ts
const XxxWidget = lazy(() =>
  import("../components/XxxDashboardWidget.js").then((m) => ({
    default: m.XxxDashboardWidget,
  })),
);

export const XXX_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "xxx.summary", // 约定 `<moduleId>.<name>`，全局唯一
    component: XxxWidget,
    order: 20, // 升序，默认 100；相同值按模块注册顺序
    span: 1, // 2 = 桌面端横跨两列
    tenantModule: "xxx", // 租户没开通该模块就不渲染
    anyPermission: ["xxx.read"], // 命中任一权限才渲染
  },
];
```

再在该模块的 `client/module.tsx` 里 `dashboardWidgets: XXX_DASHBOARD_WIDGETS`。
参考实现：`notes`（最近笔记）、`todos`（未完成待办）。

约定：

- `component` 用 `lazy()` 包一层——工作台是落地页，卡片代码不该进首屏 chunk
- 卡片自己承担 loading / 空态 / 错误态，外层只在 lazy 加载与渲染崩溃时兜底
- 卡片根节点用 `<Card className="h-full">`，栅格行内高度才对齐

## 组装层接线

模块拿不到 `ENABLED_CLIENT_MODULES`（那是 apps/client），所以卡片走依赖倒置注册：

| 环节 | 位置                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------- |
| 汇总 | `apps/client/src/collect-modules.ts` → `collectDashboardWidgets`                                    |
| 注册 | `apps/client/src/render-app-routes.tsx` → `registerDashboardWidgetsProvider`                        |
| 读取 | `client-kit/src/lib/dashboard-widgets.ts` → `getDashboardWidgets`                                   |
| 过滤 | 本模块 `client/lib/dashboard-widgets.ts`（与导航项同口径：权限 fail-closed、entitlement fail-open） |

## 启用

在 [apps/client/src/enabled-modules.ts](../../../apps/client/src/enabled-modules.ts) 注册。
排在业务模块之前，侧栏「概览」分组才在最上面。

## 如何单独测试

```bash
pnpm --filter modules exec vitest --run --project 'dashboard/*'
```
