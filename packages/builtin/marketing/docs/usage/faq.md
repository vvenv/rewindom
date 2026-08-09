---
title: 常见问题
description: 部署、路由、模块与建站的常见疑问
sort_order: 120
---

## 本地开发

### Q: 为什么 `localhost:7300` 和 `127.0.0.1:7300` 看到的不一样？

它们是两个入口。`localhost` 是产品站（默认租户），`127.0.0.1` 是平台控制台。详见 [Host 分流机制](/docs/host-routing)。

### Q: 访问 `/platform` 被重定向了？

在 `localhost`（产品站 Host）上访问 `/platform` 会被重定向到 `PLATFORM_URL`（`127.0.0.1`）。控制台只在它自己的 Host 上开放。

### Q: 租户子域本地怎么测？

在 `/etc/hosts` 加一行，例如：

```
127.0.0.1 acme.localhost
```

然后访问 `http://acme.localhost:7300`（需要 `TENANT_BASE_DOMAIN=localhost` 且存在 slug=`acme` 的租户）。

### Q: 新模块的页面 404？

新模块的路由必须挂在 `/app/<模块>` 下（如 `/app/site`）。如果挂在顶层（如 `/site`），在租户 Host 上会被租户 CMS 吃掉——`/` 归租户站点，应用区一律走 `/app/*`。

## 数据库与迁移

### Q: `migrate dev` 生成了意料之外的 DROP？

`migrate dev` 拿开发库和 schema 比对，开发库的历史痕迹会变成 DROP。改用离线 diff（影子库重放迁移历史再比对），与开发库现状无关。详见 AGENTS.md 的「生成迁移」一节。

### Q: 能直接删开发库里的表来消除漂移吗？

**不能。** 删库不改迁移历史，等于制造反向漂移，Prisma 会从「生成一条 drop」升级成「必须 reset 整个 schema」。唯一正确的路是让迁移历史与 schema 一致。

### Q: 外部模块的迁移在哪？

外部模块只声明 `prisma/schema.prisma`，迁移统一由 `apps/server` 管理。一个数据库只有一条迁移历史——外部模块的 schema 被符号链接到主 schema，迁移由消费方生成。

## 建站

### Q: 新站点为什么是空的？

默认起步模板只建首页。想要更多页面（定价、关于、联系）在站点管理里用页面预设添加，或换用 `product` 模板。

### Q: 页头没有「免费开始」按钮了？

模板不再配页头按钮（以前的 `/member/register` 在会员未开通时会 403）。需要 CTA 的在页头设置里自己加一条。

### Q: `/docs` 路径不能用做页面 slug？

对，`/docs` 是文档库的专属路径。文档库由独立的文档系统管理，不进页面版式体系。

## 文档库

### Q: 编辑后访客看不到变化？

编辑器改的是草稿，需要在文档列表行操作里点「发布」才上线。与页面版式系统同口径。

### Q: 非主语言文档怎么编辑？

文档库 v1 只编辑站点主语言。非主语言请求时整库回落主语言展示。多语言文档编辑是后续版本的能力。

## 部署

### Q: 单租户部署怎么配？

设 `SINGLE_TENANT=true`。隐藏平台控制台，所有请求视为默认租户，不暴露多租户概念。提交前跑 `pnpm check:prod-app-env` 门禁。

### Q: Docker 部署需要手动跑迁移吗？

不需要。`docker/entrypoint.sh` 会自动检测迁移基线并执行 `migrate deploy`。手动部署时执行一次 `pnpm --filter server exec prisma migrate deploy` 即可。

## 模块

### Q: `check:modules` 报错了怎么办？

校验项包括注册表、租户列、开关、权限、排序、外壳、nav、import 边界。按报错信息逐项修复——通常是注册表没登记、模块顺序不对、或 import 了禁止的包。

### Q: 外部模块能依赖其他模块吗？

不能直接 `import` 其他模块的代码。模块间通信走内核提供的扩展点（Slot、事件、共享契约）。`requires` 字段只声明依赖关系，不提供代码级访问。
