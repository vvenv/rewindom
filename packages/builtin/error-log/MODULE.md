# module-error-log

## 用途

全局错误日志存储与平台/租户查询 API（`ErrorLog` model）。

## 依赖

- kernel
- `module-rbac`

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

## 权限

| Key | 说明 |
| --- | --- |
| `error_logs.read` | 查看**本租户**错误日志与统计；没有该权限的成员只能看到自己的记录 |
| `error_logs.manage` | 清理租户历史日志、删除任意一条 |

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/error-logs` | 登录即可；有 `error_logs.read` 看本租户全量，否则强制只返回本人 |
| GET | `/api/error-logs/stats` | 租户侧统计（`error_logs.read`） |
| DELETE | `/api/error-logs/cleanup` | 清理租户历史日志（`error_logs.manage`） |
| DELETE | `/api/error-logs/cleanup/my` | 清理本人历史日志 |
| DELETE | `/api/error-logs/:id` | 有 `error_logs.manage` 删任意一条，否则只能删自己的 |
| GET | `/api/platform/error-logs` | 平台管理员（跨租户） |
| GET | `/api/platform/error-logs/stats` | 平台管理员统计 |

列表接口刻意**不做 403**：它同时承担「我的报错」，403 会让普通成员连自己的记录都取不到。
可见范围收窄发生在 handler 内（`app.hasPermission`），无权限时请求里的 `user_id` 一律忽略。

## 页面

| 路径 | 挂载点 | 说明 |
| --- | --- | --- |
| `/app/error-logs` | `renderRoutes`（租户） | 需 `error_logs.read`；`error_logs.manage` 才出现清理入口与删除按钮 |
| `/platform/error-logs` | `renderPlatformRoutes` | 跨租户只读，含租户列与租户筛选 |

## 如何单独测试

```bash
# 每个模块的 server / client / shared 各是一个 vitest project，
# 位置参数只按 project root 的相对路径过滤，跑全模块要用 --project。
pnpm --filter @rewindom/builtin exec vitest --run --project 'error-log/*'
```

## 禁止

- 不要在业务 route 中绕过 `error-handler` 中间件静默吞错
- 平台控制台不要开 `ErrorLogSheet` 的 `allowDelete`：删除走租户接口
  `/api/error-logs/:id`，平台管理员令牌打不进租户业务面（auth 中间件直接 403）
- 不要仅凭 `useTenantFilter()` 非空就渲染租户下拉：`TenantFilterProvider` 挂在
  `ShellProviders` 上，租户 `AppLayout` 也在其作用域内，必须由调用方显式开启
