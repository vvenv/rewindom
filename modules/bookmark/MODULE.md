# bookmark

外部模块**参考实现**：演示一个完整的外部模块（server + client + prisma）如何接入 be-water 平台。

## 定位

- **不是**内部模块（`packages/modules/`），而是独立 workspace 包（`packages/external-modules/`）
- 所有内核 API 通过 `@be-water/module-sdk` 门面包访问——不直接 import `server-kernel` / `client-kit` / `shared`
- 边界由 `verify-module.mjs` 的 `checkBoundary` 强制

## 结构

```
bookmark/
├── package.json          # beWater 字段声明 moduleId / prismaSchema / requires
├── tsconfig.json
├── prisma/schema.prisma  # Bookmark 模型（tenant_id 隔离）
├── shared/
│   ├── bookmark.ts       # API 类型契约
│   └── entitlements.ts   # TenantModuleEntitlement 声明
├── server/
│   ├── index.ts          # → re-export from module.ts
│   ├── module.ts         # ServerAppModule manifest（权限 / 审计 / 路由注册）
│   ├── bookmark.routes.ts
│   ├── bookmark.service.ts
│   ├── bookmark.mapper.ts
│   ├── bookmark.util.ts
│   └── i18n.ts
└── client/
    ├── module.tsx        # ClientAppModule manifest（路由 / nav / i18n）
    ├── routes.tsx
    ├── nav-sections.ts
    ├── i18n.ts
    ├── pages/bookmarks.tsx
    └── locales/{zh-CN,en}.json
```

## 接入流程

```bash
# 1. 把包放到 packages/external-modules/<moduleId>/
#    （目录名必须等于 beWater.moduleId——由 gen-external-modules 校验）

# 2. 装依赖
pnpm install

# 3. 生成注册表 + Prisma 符号链接 + 租户登记
pnpm gen:external-modules

# 4. 重新生成 Prisma client（让新模型类型可用）
pnpm --filter server exec prisma generate

# 5. 生成迁移
pnpm --filter server exec prisma migrate dev --name example_external

# 6. 校验
pnpm check:modules   # 模块契约 + 边界
pnpm check:deps      # 循环依赖
```

## 边界规则

外部模块**只许** import 自：

- `@be-water/module-sdk` — shared 契约（无框架依赖，安全在任何上下文用）
- `@be-water/module-sdk/server` — server 契约 + server-kernel 运行时（仅 server 代码用）
- `@be-water/module-sdk/client` — client 契约 + client-kit 运行时（仅 client 代码用）
- `@be-water/ui` — UI 原语
- 第三方库（react / react-router / lucide-react / react-i18next / fastify 类型 等）

**禁止**直接 import：

- `@be-water/server-kernel` / `@be-water/client-kit` / `@be-water/shared` — 通过 module-sdk 间接访问
- `@be-water/modules/*` — 内部模块实现细节
- `@be-water/server-test` / `@be-water/client-test` — 测试设施

违反以上规则的 import 会被 `pnpm check:modules` 的 `checkBoundary` 拦截。

## Prisma 类型推导

外部模块不直接 import 生成的 Prisma client 类型（那在 `@be-water/server-kernel/generated/` 下，属于禁止路径）。
mapper 通过 `typeof prisma` 推导记录类型：

```typescript
import { prisma } from "@be-water/module-sdk/server";
type BookmarkRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.bookmark.findFirst>>
>;
```

## 审计动作

内部模块用 `AuditAction` 枚举（从 `@be-water/modules/audit/shared` import）。
外部模块**不能** import 内部模块，故直接用字符串字面量：

```typescript
await emitAuditLogFromRequestSafe(app.events, app.log, request, {
  action: "BOOKMARK_CREATE",  // 字符串字面量，与 manifest.auditActions 声明一致
  ...
});
```
