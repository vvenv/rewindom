# @be-water/shared

内核与横切契约：API 响应格式、认证类型、模块 manifest、权限机制、租户目录等。

**不含**业务域 DTO/枚举（见 `packages/builtin/<id>/shared/` 与 `modules/<id>/shared/`）。
通用工具函数（日期、格式化、导入导出等）已并入本包。

## 主要内容

- API 响应与客户端辅助（`api-response`、`api-client`）
- 认证类型（`auth-types`）
- 模块契约类型（`module-contract`）
- 权限机制（`permissions`、`field-permission-utils`）
- 租户目录与默认租户常量（`tenant-catalog`、`tenant-defaults`）
- 翻译 API 契约（`translation`）

## 使用

```typescript
import { success, type User } from "@be-water/shared";
import { formatBusinessDate } from "@be-water/shared";
```

## 构建

```bash
pnpm --filter @be-water/shared build
```
