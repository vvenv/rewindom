# @rewindom/server-kernel

HTTP 内核：Fastify 基建、插件运行时、认证中间件、内核路由与基础设施服务。

## 目录心智图

```
src/
├── kernel/          HTTP 壳层（auth / public / captcha / system）
│   ├── routes/
│   └── auth/
├── runtime/         插件运行时（Loader、Registry、租户门控）≠ modules/module-*
├── infra/           进程级基建（Redis、调度器、翻译、文件存储）
├── http/            路由工具（分页、错误处理、multipart）
├── middleware/      全局中间件 + 认证辅助
├── lib/             通用基建（config、prisma、logger、tenant-scope）
├── schema/          Prisma schema 片段
└── generated/       Prisma Client
```

| 路径 | 说明 |
| --- | --- |
| `src/kernel/` | 内核 HTTP 路由与 `AuthService`、验证码、平台管理员 |
| `src/runtime/` | `ModuleLoader`、`ProviderRegistry`、模块契约、拓扑排序、JobRegistry |
| `src/infra/` | Redis、后台调度、翻译子系统、本地文件存储 |
| `src/infra/translation/` | 腾讯机翻 + LLM 直译（仅平台翻译 API 使用） |
| `src/middleware/` | 认证与全局错误处理；`attachment-content-cache` 为认证旁路辅助 |
| `src/http/` | 分页、`defineRoute`、multipart 等 HTTP 工具 |
| `src/lib/` | Prisma、config、logger、tenant-scope、`AppError`、OpenAI 客户端等 |
| `src/schema/` | 内核 Prisma 片段（由 `sync-prisma-schema` 合并） |
| `src/generated/prisma/` | 合并后的 Prisma Client |

## 内核路由

认证、公开接口、验证码、系统信息等横切 API 在 `kernel/kernel-routes.ts` 注册；业务 API 由各 `modules/module-*` 的 `registerRoutes` 提供。

## 使用

```typescript
import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";
import { ModuleLoader } from "@rewindom/server-kernel/runtime/module-loader.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { AuthService } from "@rewindom/server-kernel/kernel/auth/auth.service.js";
import { translateText } from "@rewindom/server-kernel/infra/translation/translation.service.js";
import { NotFoundError } from "@rewindom/server-kernel/lib/app-errors.js";
```

## 注意

- 仅内核基建；业务逻辑应放在 `modules/module-*`
- `runtime/` 是插件加载运行时，不要与 `modules/module-<id>/` 业务模块包混淆
- 模块包禁止 import 宿主 `apps/server/src/`，应使用本包导出

## 相关文档

- [模块化架构](../../docs/design/modular-architecture.md)
