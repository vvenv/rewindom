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
│   └── site-css/           # 贡献段 CSS 真源（assemble → site-css.generated.ts）
├── server/
│   ├── module.ts
│   ├── catalog/
│   ├── cart/
│   ├── shipping/
│   ├── payment/
│   ├── order/
│   └── ssr/                # /shop/* 与 /member/orders（走官网 chrome）
│   └── sections/           # 贡献段 SSR 渲染
└── client/
    ├── module.tsx          # 登记模板页 + 段视图
    ├── tenant/             # routes + nav
    ├── pages/
    ├── components/
    │   └── sections/       # Theme Editor 预览
    ├── hooks/
    └── locales/
```

## 面划分

| 面           | 路径                                                                                                                                                                                                                                                                                                                     | 权限 / 门控                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| 租户工作台   | `/app/shop` 商品列表、`/app/shop/products/new` 与 `/app/shop/products/:productId` 编辑（详情 + options + 数据多语言）、`/app/shop/collections` 分类、`/app/shop/discounts` 优惠码、`/app/shop/orders` 订单、`/app/shop/shipping` 运费、`/app/shop/settings` 设置（货币/报关一张表单；Stripe 密钥在 `ShopProviderSheet`） | `shop.read`；写操作 `shop.write` |
| 公开店面 SSR | `/shop`、`/shop/:slug`、`/shop/collections/:slug`、`/shop/cart`、`/shop/checkout`、`/shop/orders/:number`                                                                                                                                                                                                                | 站点开通 `shop`；无 JWT          |
| 会员         | `/member/orders`                                                                                                                                                                                                                                                                                                         | 会员会话                         |

加购与结账是真 `<form method="post">`，无 JS 也能买。

## 官网模板页与区块

店面不再自绘 HTML 外壳。路径仍是 `/shop/*`，版式是一组模板页（与文档库 / 会员页同一套
`page-templates.ts`）：默认不落库，没自定义过就按内置预设渲染；自定义之后走 Theme Editor
与同一套发布流程。分组 key 是 `shop:template.group`（「我的订单」复用会员页那一组）。

| kind                 | 路径                      | 必备段              | 区块                                                                                                                               |
| -------------------- | ------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `shop_index`         | `/shop`                   | `shop.product-grid` | —（条目来自已发布商品；`collection_slug` 可只出某一类；也能摆上首页，`limit` 控制条数）                                            |
| `shop_product`       | `/shop/:slug`             | `shop.product`      | `media` / `title` / `price` / `description` / `buy`                                                                                |
| `shop_collection`    | `/shop/collections/:slug` | `shop.product-grid` | —（按分类过滤；SEO 用分类的 `seo_*`）                                                                                              |
| `shop_cart`          | `/shop/cart`              | `shop.cart`         | `lines` / `summary`（另 POST `intent=discount` 应用优惠码）                                                                        |
| `shop_checkout`      | `/shop/checkout`          | `shop.checkout`     | `contact` / `address` / `shipping` / `note` / `summary` / `pay`（整段一张付款 POST 表单；优惠码另 POST；纯数字商品不收地址与运费） |
| `shop_order`         | `/shop/orders/:number`    | `shop.order`        | —                                                                                                                                  |
| `shop_member_orders` | `/member/orders`          | `shop.order-list`   | —                                                                                                                                  |

另有 `shop.cart-link`：**页头 / 页脚的 chrome 块**（和语言、明暗、会员同一排的按钮），
不是页面区块。开通商店后在页头「添加区块」里出现，默认不预置。有购物车时显示件数。

没有智能分类规则或树状类目：分类是手动收录（`ShopCollection` + `ShopCollectionProduct`）。整单优惠码是百分比或固定金额，基数是商品小计不含运费。工作台订单详情可全额退款（Stripe Refund，可选退库存）；不恢复优惠码次数。评价与多仓不做。

商品名称、副标题、详情、option 名/值、图片 alt、SEO 文案、分类名称/简介是**数据多语言**（扁平 locale map），跟模块 `client/locales` 的代码多语言分开。工作台用内容语言 Tab 填同一套字段，不要再加 `fieldTitleEn`。详情按 Markdown 存源码，编辑器用 `@uiw/react-md-editor`（与文档库正文同款），店面用官网同一套 `md()` / `.prose` 渲染。

租户没开通 `shop` 时这些段不进「添加区块」菜单，也不渲染。

店面 CSS 真源是 `shared/site-css/shop-storefront.css`，assemble 后进 `site-css.generated.ts` 再随段注册交给 marketing。不要手写 `shared/*-css.ts`。

## 权限

| 位置   | 收窄                                             |
| ------ | ------------------------------------------------ |
| 路由   | `shop.read` / `shop.write`（发货、退款算 write） |
| 导航   | `anyPermission: ["shop.read"]`                   |
| 页面   | `PermissionRoute permission="shop.read"`         |
| 写按钮 | `hasPermission("shop.write")`                    |

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

## Demo 数据

本地铺一套可逛的目录、优惠码、运费区和几种状态的订单（幂等，不覆盖已有 slug）：

```bash
pnpm --filter server exec tsx scripts/seed-shop-demo.ts [tenantSlug]
```

省略 slug 则写默认租户。会开通 `tenant_modules.shop`、补齐内置管理员的 `shop.read` / `shop.write`，并在站点页头加上「商店」导航。

店面：`/shop`。工作台：`/app/shop`。优惠码 `WELCOME10`（九折）、`SAVE15`（满 $50 减 $15）。真付款还要在商店设置里配 Stripe。

## 如何单独测试

```bash
pnpm --filter @rewindom/shop test
```
