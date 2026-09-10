# module-error-log

## 用途

全局错误日志存储与平台/租户查询 API（`ErrorLog` model）。除 Fastify 请求异常外，还捕获进程级未处理异常，并周期性探测 Postgres / Redis，状态翻转时落库。

## 依赖

- kernel
- `module-rbac`
- `module-background-job`（清理、进程异常监听、依赖探测）

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
| GET | `/api/platform/error-logs/health` | 平台管理员：依赖探测（始终 200；`ok` / `degraded` / `error`） |

列表接口刻意**不做 403**：它同时承担「我的报错」，403 会让普通成员连自己的记录都取不到。
可见范围收窄发生在 handler 内（`app.hasPermission`），无权限时请求里的 `user_id` 一律忽略。

公开探针（无需登录，不计入慢请求 / IP 封禁）。**不要**接到登录页或任何游客 UI：

| 路径 | 含义 |
| --- | --- |
| `GET /health` | 进程存活。Docker / CI 用这个，**不**打依赖 |
| `GET /ready` | 这个实例能否接流量。仅 Postgres 失败才 503；Redis 失败仍 200。body 只有 `{ status }` |

明细只给已登录平台管理员：`GET /api/platform/error-logs/health`（始终 200；`status` 为 `ok` / `degraded` / `error`，含 `ready` 与每项 `required`）。GET 无副作用。

进程异常写入的 `route` / `error_code`：

| 来源 | route | error_code |
| --- | --- | --- |
| `unhandledRejection` | `process:unhandledRejection` | `UnhandledRejection` |
| `uncaughtException` | `process:uncaughtException` | `UncaughtException` |
| 依赖变差 | `service:postgres` / `service:redis` | `DependencyUnhealthy` |
| 依赖恢复 | 同上 | `DependencyRecovered`（level=`info`） |
| 定时任务失败 | `job:<任务 id>` | `JobFailed` |
| 定时任务恢复 | 同上 | `JobRecovered`（level=`info`） |

同一指纹 60 秒内只落一条。`uncaughtException` 写完（最多等 2s）后进程退出；测试环境不退出。

`job:*` 来自内核 `JobRegistry` 的 `addJobRunRecorder`——内核不认识 error-log，只广播
「一轮跑完了」。任务运行态本身在 `background-job` 的平台区块（进程内存，重启清零）；
这张表是它唯一的耐久痕迹。

## 页面

| 路径 | 挂载点 | 说明 |
| --- | --- | --- |
| `/app/error-logs` | `renderRoutes`（租户） | 需 `error_logs.read`；`error_logs.manage` 才出现清理入口与删除按钮 |
| `/platform/error-logs` | `renderPlatformRoutes` | 跨租户只读，含租户列与租户筛选 |
| `/platform` | `platformDashboardSections` | 依赖健康 + 错误 KPI / 分布图 |

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
- 不要把 Docker `healthcheck` 改成 `/ready`：依赖闪断会引发滚动重启；存活继续用 `/health`
- 不要把 Postgres / Redis 状态接到登录、注册或任何游客面；也不要做未鉴权的 `/api/public/ready`
- 不要让 Redis（缓存/队列）失败变成 `/ready` 503：共享依赖闪断会把全部实例同时摘出负载
