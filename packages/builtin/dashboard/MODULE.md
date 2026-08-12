# module-dashboard

## 用途

租户登录后的默认首页 `/app/dashboard`（工作台）。本模块**只提供骨架**：栅格布局、可见性过滤、
单卡片错误隔离，以及**用户级布局**（每个用户自己决定显示哪些卡片、按什么顺序排）；
卡片内容由各业务模块通过 `client.dashboardWidgets` 自己贡献，dashboard 不 import 任何业务组件。

## 面划分

| 面     | 路由                       | 目录             | 所需权限                 |
| ------ | -------------------------- | ---------------- | ------------------------ |
| 租户侧 | `/app/dashboard`           | `client/tenant/` | 无（登录即可访问，见下） |
| API    | `/api/dashboard/preferences` | `server/`      | 无（只认证，读写本人布局）|

server 面只承载「用户级工作台布局」一件事：卡片数据仍由各业务模块自己的 API 提供，
dashboard 服务端不代理任何业务查询。

### 用户级布局（显隐 + 排序）

| 环节 | 位置 |
| --- | --- |
| 存储 | `schema.prisma` → `DashboardPreference`（`@@id([tenant_id, user_id])`，`hidden_widgets` / `widget_order` 两个 `text[]`）|
| 契约 | `shared/dashboard-preference.ts`（`normalizeDashboardWidgetIds` 前后端共用）|
| API | `GET` / `PUT` / `DELETE /api/dashboard/preferences` |
| 合并 | `client/lib/dashboard-widgets.ts` → `applyDashboardPreference` |
| 面板 | `client/components/DashboardSettingsSheet.tsx`（@dnd-kit 拖拽 + Switch 显隐）|

约定与取舍：

- **存服务端而不是 localStorage**：工作台是登录落地页，换设备/换浏览器时布局要跟着走。
  主题、侧栏布局那类纯视觉偏好仍留在本地（`useResolvedPreference`）。
- **不记审计日志**：这是本人的 UI 偏好，不是业务写操作；每次拖拽都进审计只会淹没真正的记录。
- **只认证、不查权限**：租户与用户维度全部取自会话，请求体里没有 `user_id` 可传，
  因此不存在改别人布局的入口。
- **两层过滤不能反**：先 `selectVisibleDashboardWidgets`（租户/权限允许看什么），
  再 `applyDashboardPreference`（本人想看什么）。用户不该能把无权访问的卡片显示出来。
- **新装模块的卡片排在末尾**：用户排过序之后再插队会打乱他刚摆好的布局。
- **`widget_order` 记全部卡片（含隐藏的）**：隐藏只是暂时不显示，开回来时应回到原位置。
- **卡片 id 一经发布不要改**：id 就是偏好的持久化键，改了等于老用户的配置对不上、退回默认布局。

## 为什么不加租户开关 / 权限

`/app/dashboard` 是登录落地页（`apps/client/src/home-path-candidates.ts` 的第一候选）。
一旦它可被平台关闭或需要某个权限，租户登录后就可能无处可去。因此：

- 路由不套 `TenantModuleRoute` / `PermissionRoute`
- manifest 不声明 `tenantEntitlements`
- 收窄发生在**卡片**粒度：`DashboardWidget` 的 `tenantModule` / `tenantFeature` / `anyPermission`
- 偏好 API 同理只认证不查权限——它读写的是本人的布局，没有跨用户入口

## 落地页链路

| 入口             | 位置                                                            | 行为                     |
| ---------------- | --------------------------------------------------------------- | ------------------------ |
| 登录             | `apps/client/src/shell/pages/login.tsx`                         | 租户用户 → `/app`        |
| 注册（自动登录） | `apps/client/src/shell/pages/register.tsx`                      | → `/app`                 |
| 已登录访问登录页 | `shell/components/GuestOnlyRoute.tsx`                           | → `/app`                 |
| 平台代登录       | `packages/builtin/platform/client/components/TenantImpersonateSheet.tsx` | 整页跳 `/app`            |
| 未匹配路由       | `shell/components/AppNotFoundRedirect.tsx`                      | → `AppHomeRedirect`      |
| 权限不足         | `PermissionRoute` / `SuperUserRoute` / `PlatformAdminRoute`     | → `useDefaultHomePath()` |

`/app` 是稳定入口，`AppHomeRedirect` 按 `HOME_PATH_CANDIDATES` 解析出真实首页 →
默认落到 `/app/dashboard`。产品仓要换默认首页，只改 `home-path-candidates.ts`，
不必动登录页与代登录逻辑。

守卫拒绝访问时回**当前身份**的默认首页，由 `client-kit` 的 `useDefaultHomePath()`
统一解析：平台管理员 → `PLATFORM_HOME_PATH`（`/platform`），租户用户 →
`APP_HOME_ENTRY_PATH`（`/app` → `/app/dashboard`）。`PermissionRoute` 平台侧也在用
（如 `/platform/admins`），所以它必须按身份区分，不能写死租户入口。
`/app/dashboard` 无权限门控，因此不会出现「被弹回首页又被弹走」的循环。

## 贡献一张卡片（扩展点）

在业务模块里声明，无需改 dashboard 模块：

```ts
// packages/builtin/<id>/client/tenant/dashboard-widgets.ts（外部模块为 modules/<id>/...）
const XxxWidget = lazy(() =>
  import("../components/XxxDashboardWidget.js").then((m) => ({
    default: m.XxxDashboardWidget,
  })),
);

export const XXX_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "xxx.summary", // 约定 `<moduleId>.<name>`，全局唯一，且是用户偏好的持久化键
    title: "xxx:dashboard.title", // 配置面板里的名称，`namespace:key`，渲染时才解析
    icon: Sparkles, // 配置面板列表项图标，通常与该模块导航项同一个
    component: XxxWidget,
    order: 20, // 升序，默认 100；相同值按模块注册顺序
    span: 1, // 2 = 桌面端横跨两列
    tenantModule: "xxx", // 租户没开通该模块就不渲染
    anyPermission: ["xxx.read"], // 命中任一权限才渲染
  },
];
```

再在该模块的 `client/module.tsx` 里 `dashboardWidgets: XXX_DASHBOARD_WIDGETS`。
参考实现：`notes`（最近笔记）、`todos`（未完成待办），以及内置模块的
`notification.unread` / `marketing.site` / `site-member.recent` / `user.overview` /
`billing.subscription` / `background-job.recent` / `audit.recent` / `error-log.recent`。

> `slow-query` 没有工作台卡片：它是**平台侧**模块（只有 `renderPlatformRoutes` / `platformNav`），
> 数据接口在 `/platform/*` 下，租户用户请求必然 403。慢查询概览在平台控制台的
> `/platform` 首页上（`packages/builtin/platform/client/pages/dashboard.tsx`）。

约定：

- `component` 用 `lazy()` 包一层——工作台是落地页，卡片代码不该进首屏 chunk
- 卡片外壳用 `client-kit` 的 `DashboardWidgetCard`（+ `DashboardWidgetList` / `DashboardWidgetRow`）：
  它统一了标题行、「查看全部」入口与 loading / 失败 / 空三态。手写 `Card` 的结果就是十几张卡片
  行高、留白、空态文案各不相同
- `title` 是**给配置面板用的**，不替代卡片自身的标题：卡片被隐藏时组件根本不挂载，
  面板拿不到它的标题，所以必须在 manifest 里声明
- 权限/entitlement 与该模块的导航项保持同口径，否则会出现「侧栏没有入口、工作台却有卡片」

## 组装层接线

模块拿不到 `ENABLED_CLIENT_MODULES`（那是 apps/client），所以卡片走依赖倒置注册：

| 环节 | 位置                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------- |
| 汇总 | `apps/client/src/collect-modules.ts` → `collectDashboardWidgets`                                    |
| 注册 | `apps/client/src/render-app-routes.tsx` → `registerDashboardWidgetsProvider`                        |
| 读取 | `client-kit/src/lib/dashboard-widgets.ts` → `getDashboardWidgets`                                   |
| 过滤 | 本模块 `client/lib/dashboard-widgets.ts`（与导航项同口径：权限 fail-closed、entitlement fail-open） |

## 启用

client 在 [apps/client/src/enabled-modules.ts](../../../apps/client/src/enabled-modules.ts) 注册，
排在业务模块之前，侧栏「概览」分组才在最上面；server 在
[apps/server/src/enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 注册。

## 如何单独测试

```bash
pnpm --filter @be-water/builtin exec vitest --run --project 'dashboard/*'
```
