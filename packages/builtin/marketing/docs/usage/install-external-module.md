---
title: 安装外部模块
description: 外部模块的目录结构、边界规则与接入流程
category: 核心概念
sort_order: 45
---

外部模块是内化了完整前后端定义的独立 workspace 包，通过 `@be-water/module-sdk` 门面与内核交互。本篇介绍如何把一个外部模块接入平台。

## 目录结构

```
modules/
└── my-module/
    ├── package.json          # 声明 beWater 字段
    ├── tsconfig.json
    ├── shared/               # 跨端契约（类型定义）
    │   └── index.ts
    ├── server/               # 服务端（路由 + 业务逻辑）
    │   ├── module.ts         # ServerAppModule 实现
    │   └── index.ts
    ├── client/               # 客户端（UI + 路由）
    │   ├── module.tsx        # ClientAppModule 实现
    │   ├── routes.tsx
    │   └── index.ts
    └── prisma/               # 可选：Prisma schema
        └── schema.prisma
```

## package.json

```json
{
  "name": "@be-water/my-module",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "beWater": {
    "moduleId": "my-module",
    "prismaSchema": "prisma/schema.prisma",
    "requires": []
  }
}
```

### beWater 字段

| 字段           | 类型     | 说明                                              |
| -------------- | -------- | ------------------------------------------------- |
| `moduleId`     | string   | 模块唯一标识，用于注册表、权限前缀、审计日志      |
| `prismaSchema` | string?  | Prisma schema 路径，存在则自动链接到主 schema     |
| `requires`     | string[] | 依赖的其他模块 ID（如 `["marketing"]`）           |

## 边界规则

外部模块的 import 受 `verify-module.mjs` 强制校验：

**允许导入：**

- `@be-water/module-sdk` — shared 契约
- `@be-water/module-sdk/server` — server 契约 + server-kernel 运行时（仅 server）
- `@be-water/module-sdk/client` — client 契约 + client-kit 运行时（仅 client）
- `@be-water/ui` — UI 原语组件
- 第三方库（react / react-router / lucide-react 等）

**禁止导入：**

- `@be-water/server-kernel` / `@be-water/client-kit` / `@be-water/shared` — 必须通过 module-sdk 间接访问
- `@be-water/modules` / `@be-water/builtin` — 不许直接依赖其他模块
- 任何 `apps/*` 的代码

## 接入流程

```bash
# 1. 把模块包放到 packages/modules/<moduleId>/

# 2. 装依赖 + 生成注册表
pnpm install
pnpm gen:external-modules

# 3. 如果 gen 脚本更新了 apps 的 dependencies，再装一次
pnpm install

# 4. 生成 Prisma client + 迁移（有 prisma/schema.prisma 时）
pnpm --filter server exec prisma generate
pnpm --filter server exec prisma migrate dev --name <module_name>

# 5. 校验
pnpm check:modules
pnpm check:deps
pnpm typecheck
```

## gen:external-modules 做了什么

一条命令完成外部模块接入闭环：

1. **发现** `packages/modules/*` 下的模块包
2. **生成注册表** `apps/server/src/external-modules.ts` + `apps/client/src/external-modules.ts`
3. **Prisma schema 符号链接** → `apps/server/prisma/models/<id>.prisma`
4. **租户登记** → `tenant-models.json` + `tenant-guard.ts` + `module-manifest.ts`
5. **apps 依赖同步** → 自动在 `apps/{server,client}/package.json` 补 `workspace:*` 依赖

## Prisma Schema

外部模块只声明 schema，迁移统一由 `apps/server` 管理——一个数据库只有一条迁移历史。

```prisma
model MyEntity {
  id        String   @id @default(uuid())
  tenant_id String
  name      String
  created_at DateTime @default(now())

  @@index([tenant_id])
}
```

## 校验命令

| 命令                                  | 说明                                 |
| ------------------------------------- | ------------------------------------ |
| `pnpm check:modules`                  | 模块契约 + 边界校验（import 白名单） |
| `pnpm check:deps`                     | 循环依赖检测                         |
| `pnpm typecheck`                      | TypeScript 类型校验                  |
| `node scripts/verify-module.mjs <id>` | 单模块校验                           |
