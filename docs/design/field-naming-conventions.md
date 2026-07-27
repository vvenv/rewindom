# 字段命名约定

## 概述

本文档定义 be-water 系统中跨层（数据库、API、前端、URL）的字段命名规范，确保代码一致性和可维护性。

## 核心原则

**默认使用 `snake_case`**，禁止在层间进行不必要的 camelCase 转换，减少序列化/反序列化复杂度和潜在错误。

## 各层命名规范

### 数据库（Prisma Schema）

- 表名：`snake_case`，复数形式
- 字段名：`snake_case`
- 外键：`{table}_id`，如 `tenant_id`、`document_id`
- 时间戳：`{action}_at`，如 `created_at`、`updated_at`、`deleted_at`
- 布尔字段：优先使用 `is_` 或 `has_` 前缀，如 `is_active`、`has_permission`

```prisma
model Document {
  document_id    String   @id @default(cuid())
  tenant_id      String
  title          String
  content_type   String?
  is_processed   Boolean  @default(false)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  tenant         Tenant   @relation(fields: [tenant_id], references: [tenant_id])
}
```

### API 响应/请求

- JSON 字段：`snake_case`
- 错误响应：`{ error: string }`
- 成功响应：`{ data: T }`

```json
{
  "data": {
    "document_id": "doc_123",
    "tenant_id": "tenant_456",
    "title": "季度运营纪要",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### 共享类型（packages/shared）

- TypeScript 接口字段：`snake_case`
- 与数据库和 API 保持一致

```typescript
interface Document {
  document_id: string;
  tenant_id: string;
  title: string;
  content_type?: string;
  is_processed: boolean;
  created_at: Date;
}
```

### 前端业务类型

- 从 API 获取的数据保持 `snake_case`
- 组件内局部变量可用 `camelCase`（仅用于解构后的临时变量）

```typescript
const { document_id, tenant_id } = document;
const documentId = document_id;
const tenantId = tenant_id;
```

### URL 命名规则

| 类型        | 规范                            | 示例                                             |
| ----------- | ------------------------------- | ------------------------------------------------ |
| path 参数名 | `camelCase`                     | `/documents/:documentId`、`/products/:productId` |
| 查询参数键  | `snake_case`，与 API query 同名 | `?tenant_id=xxx&status=draft`                    |

```typescript
searchParams.get("page_size");
searchParams.get("tenant_id");

api.get("/notes", { tenant_id, status });
```

## 命名风格对比

| 场景          | 推荐             | 禁止                |
| ------------- | ---------------- | ------------------- |
| 数据库字段    | `user_id`        | `userId`、`user-id` |
| API JSON      | `created_at`     | `createdAt`         |
| URL path 参数 | `/users/:userId` | `/users/:user_id`   |
| URL 查询参数  | `?page_size=10`  | `?pageSize=10`      |
| Prisma 模型   | `tenant_id`      | `tenantId`          |

## 设计决策理由

1. **减少转换成本**：统一使用 `snake_case` 避免层间的字段名转换
2. **数据库友好**：PostgreSQL 对 `snake_case` 有更好的原生支持
3. **URL 查询参数一致性**：查询参数与 API 参数同名，降低认知负担
4. **path 参数特殊处理**：`camelCase` 符合前端路由框架惯例（如 Next.js）
