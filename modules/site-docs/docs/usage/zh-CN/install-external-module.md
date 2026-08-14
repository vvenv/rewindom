---
title: 安装外部模块
description: 外部模块的目录结构、边界规则与接入流程
category: core-concepts
sort_order: 45
---

外部模块是一个自带前后端定义的独立 workspace 包，放在仓库根的 `modules/` 下，通过
`@rewindom/module-sdk` 门面与内核交互。

## 目录结构

```
modules/
└── my-module/
    ├── package.json          # 声明 rewindom 字段
    ├── tsconfig.json
    ├── MODULE.md             # 这个模块是干什么的
    ├── shared/               # 跨端契约
    ├── server/               # module.ts + 路由 + 业务逻辑
    ├── client/               # module.tsx + 页面 + i18n
    └── prisma/               # 可选：schema.prisma
```

## package.json

```json
{
  "name": "@rewindom/my-module",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "rewindom": {
    "moduleId": "my-module",
    "prismaSchema": "./prisma/schema.prisma",
    "requires": ["rbac", "audit"]
  }
}
```

| 字段           | 类型     | 说明                                          |
| -------------- | -------- | --------------------------------------------- |
| `moduleId`     | string   | 唯一标识：注册表、权限前缀、审计日志都用它    |
| `prismaSchema` | string?  | schema 路径，填了就自动链接到主 schema        |
| `requires`     | string[] | 依赖的模块 ID，只声明顺序与前置，不给代码访问 |

## 边界规则

import 由 `verify-module.mjs` 强制校验。

**允许：**

- `@rewindom/module-sdk` — shared 契约
- `@rewindom/module-sdk/server` — server 契约与运行时（仅 server 侧）
- `@rewindom/module-sdk/client` — client 契约与运行时（仅 client 侧）
- `@rewindom/ui` — UI 原语
- 第三方库（react、react-router、lucide-react 等）

**禁止：**

- `@rewindom/server-kernel` / `@rewindom/client-kit` / `@rewindom/shared` — 一律经
  module-sdk 间接访问，内核的内部结构不该成为模块的依赖面
- 其它模块的包 — 跨模块走扩展点，不走 import
- `apps/*` 里的任何代码

## 接入流程

```bash
# 1. 把模块包放进 modules/<moduleId>/

# 2. 装依赖 + 生成注册表
pnpm install
pnpm gen:external-modules

# 3. gen 脚本可能给 apps 补了 workspace 依赖，再装一次
pnpm install

# 4. 有 prisma schema 时：生成 client + 迁移
pnpm --filter server exec prisma generate
pnpm --filter server exec prisma migrate dev --name <module_name>

# 5. 校验
pnpm check:modules
pnpm check:deps
pnpm typecheck
```

### gen:external-modules 做了什么

1. 发现 `modules/*` 下的模块包
2. 生成 `apps/{server,client}/src/external-modules.ts` 两份注册表
3. 把模块的 Prisma schema 符号链接到 `apps/server/prisma/models/<id>.prisma`
4. 登记租户列与模块清单
5. 给 `apps/{server,client}/package.json` 补上 `workspace:*` 依赖

## Prisma schema

外部模块只声明模型，迁移统一由 `apps/server` 生成和管理——**一个数据库只有一条迁移
历史**，各模块各管一段的话，部署顺序会立刻变成没人算得清的问题。

```prisma
model MyEntity {
  id         String   @id @default(uuid())
  tenant_id  String
  name       String
  created_at DateTime @default(now())

  @@index([tenant_id])
}
```

`tenant_id` 不是可选项：没有它的表会被模块契约校验挡下来。

## 下一步

- 模块的整体设计 → [模块化架构](/docs/modular-architecture)
