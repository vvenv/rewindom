# be-water 文档索引

> 开发时优先查 **Skills**（见 `AGENTS.md`）；本文档为 `docs/` 完整目录。与代码冲突时以 **代码 + Prisma schema** 为准。

## 运维

| 文档                             | 说明                     |
| -------------------------------- | ------------------------ |
| [deployment.md](./deployment.md) | 部署、蓝绿切换、环境变量 |
| [faq.md](./faq.md)               | 常见问题与排障           |

## 技术设计（`design/`）

### 架构

| 文档                                                        | 说明                                | Skill                          |
| ----------------------------------------------------------- | ----------------------------------- | ------------------------------ |
| [modular-architecture.md](./design/modular-architecture.md) | 内核 + 可插拔模块的模块化 Monolith  | `create-module`、`extract-module` |

### 多租户 / SaaS

| 文档                                              | 说明           |
| ------------------------------------------------- | -------------- |
| [tenant-config.md](./design/tenant-config.md)     | 租户配置与密钥 |
| [tenant-features.md](./design/tenant-features.md) | 功能开关与配额 |
| [user-system.md](./design/user-system.md)         | 用户与认证     |

### 权限 / 规范

| 文档                                                                | Rule / Skill               |
| ------------------------------------------------------------------- | -------------------------- |
| [permission-system.md](./design/permission-system.md)               | —                          |
| [field-naming-conventions.md](./design/field-naming-conventions.md) | —                          |
| [unit-testing.md](./design/unit-testing.md)                         | —                          |

### 可观测性

| 文档                                          | Skill           |
| --------------------------------------------- | --------------- |
| [error-logging.md](./design/error-logging.md) | `error-logging` |

## 前端

前端页面的四层拆分（Page / Hook / Lib / Component）见 `frontend-page-structure` skill。

## 数据库

| 场景                            | Skill              |
| ------------------------------- | ------------------ |
| 收敛 migration 历史为单条 init  | `merge-migrations` |
| Prisma Client 与数据库不同步     | `prisma-sync-fix`  |
