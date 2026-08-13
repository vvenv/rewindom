# shop

外部模块：商品目录、购物车、结账与履约。包名 `@rewindom/shop`。

一期打通 **商品 → 购物车 → 游客/会员结账 → Stripe Checkout → 商家填运单号发货**。物流商 API、17track、自动关税只留 Provider 接口。

## 定位

- 独立 workspace 包，内核 API 只走 `@rewindom/module-sdk`
- 一个业务域一个物理包：catalog / cart / checkout / order / shipping / tax 都在本包内
- Entitlement `shop`，**默认关闭**（不是每个站点都开店）
- 未开通时公开店面与买家接口 404，不漏出商店

## 结构

```
shop/
├── MODULE.spec.yaml
├── MODULE.md
├── package.json
├── prisma/schema.prisma
├── shared/                 # 类型与 entitlement
├── server/
│   ├── module.ts
│   ├── catalog/
│   ├── cart/
│   ├── shipping/
│   ├── payment/
│   ├── order/
│   └── ssr/                # /shop/* 与 /member/orders
└── client/
    ├── module.tsx
    ├── tenant/             # routes + nav
    ├── pages/
    ├── components/
    ├── hooks/
    └── locales/
```

## 面划分

| 面 | 路径 | 权限 / 门控 |
| --- | --- | --- |
| 租户工作台 | `/app/shop` 商品、`/app/shop/orders` 订单、`/app/shop/shipping` 运费、`/app/shop/settings` 设置 | `shop.read`；写操作 `shop.write` |
| 公开店面 SSR | `/shop`、`/shop/:slug`、`/shop/cart`、`/shop/checkout`、`/shop/orders/:number` | 站点开通 `shop`；无 JWT |
| 会员 | `/member/orders` | 会员会话 |

加购与结账是真 `<form method="post">`，无 JS 也能买。

## 权限

| 位置 | 收窄 |
| --- | --- |
| 路由 | `shop.read` / `shop.write`（发货算 write） |
| 导航 | `anyPermission: ["shop.read"]` |
| 页面 | `PermissionRoute permission="shop.read"` |
| 写按钮 | `hasPermission("shop.write")` |

## 依赖

`rbac` · `audit` · `marketing` · `site-member`

不依赖 Creem / `billing`。订阅收款和卖货收款分开。Stripe 密钥：平台 env 兜底 + 站点 `TenantSetting.secret` 覆盖（key=`shop_stripe_provider`）。

## 前台路由与部署前缀

店面收在 `/shop/*`，避免再占 CMS 顶层 slug。三处必须一起改（测试盯齐）：

- `SITE_APP_PREFIXES` 含 `shop`
- `SITE_SSR_EXCEPTION_PATHS` 含 `/member/orders`；`/shop` **前缀匹配**
- nginx + vite dev 代理

Webhook：`POST /api/shop/webhooks/stripe`，免 JWT。先从 metadata 取 `tenant_id` 再验签。

库存只在 `checkout.session.completed` 事务内扣减；Session 过期/失败则订单 `cancelled`、不扣库存。

## 跨境底稿（一期）

SKU 上 `hs_code` / `origin_country`，发货写入 `ShopShipment.customs_snapshot`。站点可配 IOSS / EORI。可选 Stripe Tax（Checkout Session `automatic_tax`）；关掉则税为 0。`CarrierProvider` / `TaxProvider` 已预留，物流商 API 二期再填。

## 接入

```bash
pnpm install
pnpm gen:external-modules
pnpm --filter server exec prisma generate
pnpm --filter server exec prisma migrate dev --name add_shop
pnpm check:modules
```

## 如何单独测试

```bash
pnpm --filter @rewindom/shop test
```
