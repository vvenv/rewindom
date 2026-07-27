# 错误日志

## 概述

错误日志模块负责记录系统运行过程中的异常信息，支持多级别日志记录、上下文捕获和租户隔离，为问题排查和系统监控提供数据支撑。

## 数据模型

### ErrorLog（错误日志）

```prisma
model ErrorLog {
  error_id      String   @id @default(cuid())
  tenant_id     String?
  level         LogLevel
  message       String
  stack_trace   String?
  user_id       String?
  username      String?
  route         String?
  method        String?
  error_code    String?
  context       String?
  created_at    DateTime @default(now())
  
  tenant        Tenant?  @relation(fields: [tenant_id], references: [tenant_id])
  user          User?    @relation(fields: [user_id], references: [user_id])
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
  FATAL
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `error_id` | String | 错误记录唯一标识 |
| `tenant_id` | String? | 租户标识（可选，平台级错误为空） |
| `level` | Enum | 日志级别：DEBUG/INFO/WARN/ERROR/FATAL |
| `message` | String | 错误消息 |
| `stack_trace` | String? | 堆栈跟踪信息 |
| `user_id` | String? | 用户标识（可选） |
| `username` | String? | 用户名（冗余存储，便于查询） |
| `route` | String? | 请求路由 |
| `method` | String? | HTTP 方法 |
| `error_code` | String? | 错误码 |
| `context` | String? | 上下文信息（JSON 字符串） |
| `created_at` | DateTime | 创建时间 |

### 日志级别说明

| 级别 | 说明 | 使用场景 |
| --- | --- | --- |
| DEBUG | 调试信息 | 开发调试、详细执行流程 |
| INFO | 一般信息 | 正常业务操作记录 |
| WARN | 警告信息 | 潜在问题、需要关注的情况 |
| ERROR | 错误信息 | 业务异常、API 错误 |
| FATAL | 致命错误 | 系统崩溃、无法恢复的错误 |

## ErrorService

### 核心方法

```typescript
interface ErrorService {
  logError(message: string, context?: ErrorContext): Promise<void>;
  logWarning(message: string, context?: ErrorContext): Promise<void>;
  logInfo(message: string, context?: ErrorContext): Promise<void>;
  logDebug(message: string, context?: ErrorContext): Promise<void>;
  logFatal(message: string, context?: ErrorContext): Promise<void>;
  
  getErrorLogs(filters: ErrorLogFilters): Promise<ErrorLog[]>;
  getErrorStats(filters: ErrorStatsFilters): Promise<ErrorStats>;
  cleanupOldLogs(days: number): Promise<number>;
}
```

### 上下文结构

```typescript
interface ErrorContext {
  tenant_id?: string;
  user_id?: string;
  username?: string;
  route?: string;
  method?: string;
  error_code?: string;
  stack_trace?: string;
  request_body?: unknown;
  response_status?: number;
  [key: string]: unknown;
}
```

### 使用示例

```typescript
import { errorService } from "../services/error-service";

try {
  // 业务逻辑
} catch (error) {
  await errorService.logError(error.message, {
    tenant_id: request.user.tenant_id,
    user_id: request.user.user_id,
    username: request.user.username,
    route: request.route,
    method: request.method,
    stack_trace: error.stack,
    error_code: "DOCUMENT_PARSE_ERROR",
  });
}
```

## 全局错误处理中间件

`error-handler.ts` 中间件捕获未处理的异常并自动写入数据库：

```typescript
import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await errorService.logError(error.message, {
    tenant_id: request.user?.tenant_id,
    user_id: request.user?.user_id,
    username: request.user?.username,
    route: request.routeOptions.url,
    method: request.method,
    stack_trace: error.stack,
    error_code: error.code,
    response_status: error.statusCode,
  });

  reply.status(error.statusCode || 500).send({
    error: error.message,
  });
}
```

## API 接口

### 错误日志列表

```
GET /api/error-logs?page=&page_size=&level=&user_id=&route=&error_code=&start_date=&end_date=
```

**参数说明**：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `page` | Number | 1 | 页码 |
| `page_size` | Number | 20 | 每页数量 |
| `level` | String | - | 日志级别筛选 |
| `user_id` | String | - | 用户标识筛选（仅 SUPERUSER） |
| `route` | String | - | 路由筛选 |
| `error_code` | String | - | 错误码筛选 |
| `start_date` | String | - | 开始日期（ISO 格式） |
| `end_date` | String | - | 结束日期（ISO 格式） |

**响应格式**：

```json
{
  "data": [
    {
      "error_id": "error_123",
      "level": "ERROR",
      "message": "文档解析失败",
      "error_code": "DOCUMENT_PARSE_ERROR",
      "user_id": "user_456",
      "username": "admin",
      "route": "/api/documents/upload",
      "method": "POST",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "has_more": true
  }
}
```

### 错误统计

```
GET /api/error-logs/stats
```

**响应格式**：

```json
{
  "data": {
    "total": 150,
    "by_level": {
      "DEBUG": 20,
      "INFO": 50,
      "WARN": 30,
      "ERROR": 45,
      "FATAL": 5
    },
    "by_error_code": {
      "DOCUMENT_PARSE_ERROR": 20,
      "AI_API_ERROR": 15,
      "PERMISSION_DENIED": 10
    },
    "trend": [
      { "date": "2024-01-10", "count": 10 },
      { "date": "2024-01-11", "count": 15 },
      { "date": "2024-01-12", "count": 8 }
    ]
  }
}
```

### 清理历史日志

```
DELETE /api/error-logs/cleanup?days=30
```

**参数说明**：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `days` | Number | 30 | 删除多少天前的日志 |

**响应格式**：

```json
{
  "data": {
    "deleted_count": 500
  }
}
```

## 权限控制

| 操作 | 权限要求 | 说明 |
| --- | --- | --- |
| 查看自己的日志 | 无 | 普通用户仅能查看自己产生的错误日志 |
| 查看所有日志 | `SUPERUSER` | 租户管理员可查看整个租户的日志 |
| 查看平台日志 | `PLATFORM_ADMIN` | 平台管理员可查看所有租户日志 |
| 清理日志 | `SUPERUSER` | 需要租户管理员权限 |

## 前端页面

### 错误日志列表页

页面路径：`/error-logs`

**功能**：
- 日志列表展示（分页）
- 多维度筛选（级别、用户、路由、错误码、日期范围）
- 日志详情展开（查看完整上下文和堆栈）
- 统计图表（按级别分布、按错误码分布）

### 筛选组件

`ErrorLogFilters` 组件：
- 支持 URL 参数同步
- 查询参数一律 `snake_case`
- 与 API 参数同名

### URL 参数示例

```
/error-logs?page=1&page_size=20&level=ERROR&error_code=DOCUMENT_PARSE_ERROR&start_date=2024-01-01&end_date=2024-01-31
```

## 性能优化

### 索引策略

```sql
CREATE INDEX ON "ErrorLog" ("tenant_id", "created_at");
CREATE INDEX ON "ErrorLog" ("user_id", "created_at");
CREATE INDEX ON "ErrorLog" ("level", "created_at");
CREATE INDEX ON "ErrorLog" ("error_code", "created_at");
```

### 数据清理

- 定期清理策略：保留最近 30/90/180 天日志
- 自动清理任务：使用 BullMQ 定时执行

### 查询优化

- 分页查询使用 cursor-based 分页
- 统计查询使用聚合索引

## 与可观测性的关系

错误日志是可观测性体系的一部分，与监控告警配合使用，详见 `observability-alerting.md`。
