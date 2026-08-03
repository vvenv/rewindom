# be-water 文档索引

> 开发时优先查 **Skills**（见 `AGENTS.md`）；本文档为 `docs/` 完整目录。与代码冲突时以 **代码 + Prisma schema** 为准。

## 运维

| 文档                                     | 说明                                       |
| ---------------------------------------- | ------------------------------------------ |
| [deployment.md](./deployment.md)         | 部署、蓝绿切换、环境变量                   |
| [custom-domain.md](./custom-domain.md)   | 租户自定义域名：客户 DNS / 平台绑定 / TLS |
| [faq.md](./faq.md)                       | 常见问题与排障                             |

## 技术设计（`design/`）

### 架构

| 文档                                                        | 说明                                | Skill                          |
| ----------------------------------------------------------- | ----------------------------------- | ------------------------------ |
| [modular-architecture.md](./design/modular-architecture.md) | 内核 + 可插拔模块的模块化 Monolith  | `create-module`、`extract-module` |
| [agent-first.md](./design/agent-first.md) | Agent-first：AGENTS.md / Skills / gen·check 闭环与卖点口径 | `create-module` 等 |
| [downstream-fork.md](./design/downstream-fork.md) | 产品仓升级到 be-water 的检查清单（布局 / 品牌 / 默认路由） | `frontend-page-structure` |

### 多租户 / SaaS

| 文档                                              | 说明           |
| ------------------------------------------------- | -------------- |
| [tenant-config.md](./design/tenant-config.md)     | 租户配置与密钥；含 `SINGLE_TENANT` 单租户部署 |
| [i18n.md](./design/i18n.md)                       | 多语言（zh-CN / en） |
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
