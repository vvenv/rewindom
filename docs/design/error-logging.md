# 错误日志

模块：`packages/modules/error-log/`（Skill：`error-logging`）

全局 error-handler 捕获未处理异常并落库，提供租户内查询、统计与清理。与慢查询（`slow-query`）同属可观测性基础设施模块。

## 数据模型

### ErrorLog

```prisma
model ErrorLog {
  id             String   @id @default(uuid())
  level          String
  message        String
  stack_trace    String?
  user_id        String?
  username       String?
  tenant_slug    String?
  route          String?
  method         String?
  ip_address     String?
  user_agent     String?
  request_body   Json?
  request_params Json?
  request_query  Json?
  error_code     String?
  context        Json?
  created_at     DateTime @default(now())

  @@index([user_id])
  @@index([tenant_slug])
  @@index([level])
  @@index([created_at])
  @@index([error_code])
  @@index([request_body(ops: JsonbPathOps)], type: Gin)
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | String | uuid 主键 |
| `level` | String | `error` / `warn` / `info` / `debug`（普通字符串，非 enum） |
| `message` | String | 错误消息 |
| `stack_trace` | String? | 堆栈 |
| `user_id` / `username` | String? | 触发用户；`username` 冗余存储便于列表展示 |
| `tenant_slug` | String? | 租户标识；平台级错误为 `null` |
| `route` / `method` | String? | 请求路由与 HTTP 方法 |
| `ip_address` / `user_agent` | String? | 客户端信息 |
| `request_body` | Json? | 请求体 |
| `request_params` | Json? | 路由参数 |
| `request_query` | Json? | 查询参数 |
| `error_code` | String? | 错误码，取自 `error.name` |
| `context` | Json? | 附加上下文，如 `{ "statusCode": 500 }` |
| `created_at` | DateTime | 创建时间 |

**没有外键关系**：`ErrorLog` 不 relation 到 `User` / `Tenant`。日志要在用户被删除后仍然留存，租户维度靠精确匹配 `tenant_slug` 字符串过滤（`tenant_slug IS NULL` 的行只出现在平台侧）。

### 四个 JSON 列

`request_body` / `request_params` / `request_query` / `context` 是 **jsonb** 列，不是 JSON 字符串：

- 写入侧传纯 JSON 值，服务内部不再 `JSON.stringify`
- 读出侧拿到的就是结构化对象，前端直接 `JSON.stringify(value, null, 2)` 展示即可
- 共享类型是 `JsonValue | null`（`@be-water/shared`）

只有 `request_body` 建了 GIN 索引，用 `jsonb_path_ops`——体积约为默认 `jsonb_ops` 的 1/3，代价是只支持 `@>` / `@?` / `@@`，不支持键存在查询（`?` / `?|` / `?&`）。其余三列不建索引：`request_params` / `request_query` 的信息基本已被 `route` 覆盖，`context` 目前只装小字段，日志表写入频繁，不为没有的查询预付索引维护成本。

按内容检索的写法：

```ts
// Prisma
await prisma.errorLog.findMany({
  where: { request_body: { path: ["user_id"], equals: "u-1" } },
});

// SQL（走 GIN 索引）
SELECT * FROM "ErrorLog" WHERE request_body @> '{"user_id":"u-1"}';
```

## ErrorService

`packages/modules/error-log/server/error.service.ts`，**静态类**（不是实例单例）。

```ts
class ErrorService {
  // 写入
  static log(input: ErrorLogInput): Promise<void>;
  static logError(error: Error, context?): Promise<void>;   // 第一参是 Error 对象
  static logWarning(message: string, context?): Promise<void>;
  static logInfo(message: string, context?): Promise<void>;
  static logDebug(message: string, context?): Promise<void>;

  // 查询
  static getErrorLogs(filters): Promise<ErrorLog[]>;
  static getErrorLogsCount(filters): Promise<number>;
  static getErrorLogsByLevel(level, take?): Promise<ErrorLog[]>;
  static getErrorLogsByUser(userId, take?): Promise<ErrorLog[]>;
  static getErrorLogById(id, tenantSlug): Promise<ErrorLog | null>;
  static getErrorStats(timeRange?): Promise<ErrorStats>;

  // 删除
  static cleanupOldLogs(daysToKeep?, userId?, tenantSlug?): Promise<number>;
  static deleteErrorLog(id, tenantSlug): Promise<void>;

  static belongsToTenant(log, tenantSlug): boolean;
}
```

没有 `logFatal`——级别只有四档。

### 输入结构

```ts
interface ErrorLogInput {
  level: "error" | "warn" | "info" | "debug";
  message: string;
  stackTrace?: string;
  userId?: string;
  username?: string;
  tenantSlug?: string | null;
  route?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: unknown;    // 纯 JSON 值，不要预先 stringify
  requestParams?: unknown;
  requestQuery?: unknown;
  errorCode?: string;
  context?: Record<string, unknown>;
}
```

字段为 `undefined` 时不写入该列（列保持 NULL）；显式传 `null` 写入 JSON `null`。

### 使用示例

```ts
import { ErrorService } from "./error.service.js";

try {
  // 业务逻辑
} catch (error) {
  await ErrorService.logError(error as Error, {
    userId: request.authUser?.userId,
    username: request.authUser?.username,
    tenantSlug: request.tenantContext?.tenant_slug,
    route: request.url,
    method: request.method,
    errorCode: "TODO_IMPORT_FAILED",
    additionalContext: { statusCode: 500 },
  });
}
```

## 全局错误处理中间件

`packages/server-kernel/src/middleware/error-handler.middleware.ts`。

内核不依赖业务模块，所以中间件不直接 import `ErrorService`，而是通过 `setErrorLogWriter(writer)` 注册写入函数——`error-log` 模块启动时把 `ErrorService.logError` 注进来。未注册时中间件照常返回响应，只是不落库。

中间件负责把 `request.body` / `params` / `query` 归一化成可写进 jsonb 的纯 JSON 值：`JSON.parse(JSON.stringify(value))` 一步展开 `Date` 与自定义 `toJSON`，并在循环引用、`BigInt` 这类不可序列化输入上就地失败返回 `undefined`——否则会留到 `prisma.create()` 里抛，而那时已经在错误处理器内部了。

### 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `ERROR_LOGGING_ENABLED` | `true` | 关掉后中间件不落库 |
| `ERROR_LOG_LEVEL` | `error` | 记录级别 |
| `ERROR_LOG_INCLUDE_REQUEST_BODY` | `true` | 是否采集 `request_body` |
| `ERROR_LOG_INCLUDE_REQUEST_PARAMS` | `true` | 是否采集 `request_params` |
| `ERROR_LOG_INCLUDE_REQUEST_QUERY` | `true` | 是否采集 `request_query` |
| `ERROR_LOG_RETENTION_DAYS` | `30` | 见下方「数据清理」——目前只被配置测试读取 |

请求体可能含密码、令牌等敏感信息。生产环境按需关闭 `ERROR_LOG_INCLUDE_REQUEST_BODY`，或在写入前自行脱敏。

## API

挂载在 `/api/error-logs`。

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/` | 登录 | 租户内列表；非系统管理员强制只看自己的日志 |
| GET | `/stats` | `error_logs.read` | 统计 |
| DELETE | `/cleanup` | `error_logs.manage` | 清理租户内历史日志 |
| DELETE | `/cleanup/my` | 登录 | 清理本人历史日志 |
| DELETE | `/:id` | 登录 | 删除单条；非系统管理员只能删自己的 |

三个 DELETE 都记审计日志（`ERROR_LOG_CLEANUP` / `ERROR_LOG_DELETE`）。

### 列表

```
GET /api/error-logs?page=&page_size=&level=&user_id=&q=&start_date=&end_date=&sort_by=&sort_dir=
```

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `page` / `page_size` | 1 / 20 | 偏移分页（非 cursor） |
| `level` | - | 级别筛选 |
| `user_id` | - | 仅系统管理员生效；普通用户被强制为自己 |
| `q` | - | 模糊搜索，覆盖 `username` / `route` / `error_code` |
| `start_date` / `end_date` | - | `YYYY-MM-DD` 或含空格的完整时间戳 |
| `sort_by` | `created_at` | 白名单：`created_at`、`level`、`tenant_slug`、`username`、`route`、`method`、`error_code` |
| `sort_dir` | `desc` | `asc` / `desc` |

`q` 只搜三个字符串列，**不搜 `message` 和 jsonb 列**。

```json
{
  "data": {
    "items": [
      {
        "id": "0f8c…",
        "level": "error",
        "message": "Cannot read properties of undefined",
        "error_code": "TypeError",
        "user_id": "user_456",
        "username": "admin",
        "tenant_slug": "acme",
        "route": "/api/todos",
        "method": "POST",
        "request_body": { "title": "" },
        "context": { "statusCode": 500 },
        "created_at": "2026-07-28T10:30:00.000Z"
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 100,
    "page_count": 5
  }
}
```

### 统计

```
GET /api/error-logs/stats?start_date=&end_date=
```

```json
{
  "data": {
    "total": 150,
    "by_level": { "error": 45, "warn": 30, "info": 50, "debug": 25 },
    "by_route": { "/api/todos": 20 },
    "by_error_code": { "TypeError": 20 }
  }
}
```

聚合由数据库完成：一次 `count` + 三次 `groupBy`（`level` / `route` / `error_code`），
与 `slow-query` 模块的 `getStats` 同一套写法。`route` / `error_code` 为 NULL 的行
会被 `groupBy` 单独分一组，这些行不计入对应分布。

### 清理

```
DELETE /api/error-logs/cleanup?days=30
DELETE /api/error-logs/cleanup/my?days=30
```

```json
{ "data": { "deletedCount": 500 } }
```

## 权限

`packages/modules/error-log/server/module.ts` 声明，分组「系统监控」：

| 权限 | 说明 |
| --- | --- |
| `error_logs.read` | 查看错误日志（统计接口） |
| `error_logs.manage` | 管理错误日志（租户级清理） |

列表与单条删除只要求登录，租户隔离与「只能看/删自己的」由路由内的 `is_system_admin` 判断兜底。

## 前端

`packages/modules/error-log/client/`，页面路径 `/app/error-logs`（平台侧另有 `usePlatformErrorLogs`）。

| 文件 | 职责 |
| --- | --- |
| `pages/error-logs.tsx` | 页面外壳 |
| `components/ErrorLogsTable.tsx` | 列表 |
| `components/ErrorLogFilters.tsx` | 筛选，URL 参数同步 |
| `components/ErrorLogSheet.tsx` | 详情抽屉；四个 jsonb 字段由内部 `JsonField` 统一渲染，值为 `null` 时整块不显示 |

URL 查询参数与 API 同名、一律 snake_case：`user_id`、`start_date`、`page_size`。

## 数据清理

**目前没有自动清理任务。** `ERROR_LOG_RETENTION_DAYS` 已在配置里定义，但除配置测试外无人读取——清理只能靠 `DELETE /api/error-logs/cleanup` 手动触发。

对照组：`slow-query` 模块有 `scheduler-jobs.ts`，每 30 分钟按 `SLOW_QUERY_RETENTION_DAYS` 自动清理。error-log 要补自动清理的话，照抄那个文件即可。

## 表增长与后续演进

`ErrorLog` 是持续增长的日志表。按优先级：

1. 先补自动清理（见上）——保留窗口是最便宜的手段
2. 再考虑按 `created_at` 声明式分区 + BRIN 索引
3. 再考虑拆到独立 Postgres 实例
4. 聚合分析成为主要场景后才考虑列存（ClickHouse 一类），而不是换文档数据库

## 相关

- 慢查询：`slow-query` 模块
- 审计日志：`docs/design/`（`audit` 模块）
- 字段命名：`docs/design/field-naming-conventions.md`
