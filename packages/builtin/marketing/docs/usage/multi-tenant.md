---
title: 多租户架构
description: 租户隔离、数据范围与单租户模式
category: 核心概念
---

# 多租户架构

平台从设计之初就是多租户的：一套部署服务多个互不干扰的租户，每个租户有自己的站点、用户、数据。

## 什么是租户

租户（Tenant）是数据隔离的顶层边界。一个租户对应一个组织/客户，拥有：

- 自己的营销站点（页面、文档、主题）
- 自己的用户与权限
- 自己的会员体系
- 自己的数据（按 `tenant_id` 隔离）

> 在租户侧与公开面，文案**不出现**「租户」「Tenant」字样——对终端用户而言它就是一个「站点」或「组织」。

## 数据隔离

所有业务表都带 `tenant_id` 列，查询统一走 `withTenantScope(tenant_id)` 强制注入租户范围。这保证了一个租户永远访问不到另一个租户的数据。

```typescript
// 服务层示例：withTenantScope 自动注入 tenant_id 条件
const records = await prisma.marketingDoc.findMany({
  where: withTenantScope(tenant_id, { status: "published" }),
});
```

## 默认租户

slug 为 `default` 的租户是产品主域隐式绑定的组织。访问 `FRONTEND_URL`（本地 `localhost`）看到的就是默认租户的站点。

- 首次部署后用 `seed-local-marketing-site` 脚本初始化它的内容。
- 平台文档（如本篇）跟代码版本走，给默认租户产品站用。

## 租户的创建与管理

在平台控制台（`PLATFORM_URL`，本地 `127.0.0.1`）创建和管理租户：

- 启用/停用租户
- 配置租户功能开关与配额
- 绑定自定义域名
- 管理租户模块启用

## 单租户模式

面向私有部署场景，设 `SINGLE_TENANT=true`：

- 隐藏平台控制台与租户管理
- 所有请求视为默认租户
- 不暴露多租户概念

单租户模式与多租户模式共用同一套代码，只是运行时配置不同——不需要为单租户部署维护单独的分支。

## 路由与 Host 分流

租户站点的入口由 Host 决定，不是 URL 路径：

- `FRONTEND_URL` → 默认租户
- `{slug}.{TENANT_BASE_DOMAIN}` → 对应 slug 的租户
- 租户自定义域名 → 绑定的租户

详见 [Host 分流机制](/docs/host-routing)。
