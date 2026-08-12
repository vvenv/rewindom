# module-billing

## 用途

**平台租户付费**：组织自助购买平台套餐（`PRICING_PLANS`），钱进平台的 Creem 账号。
平台侧可查看跨租户订阅 / 付款。

站点会员向站点付费是**另一个领域**，在 [`site-billing`](../site-billing/MODULE.md)——
两边共用的只有支付通道那层壳（本模块的 `PaymentProvider` 抽象与 `createCreemProvider`）。

## 面划分

| 面 | 路由 | 目录 | 所需权限 |
| --- | --- | --- | --- |
| 租户侧 | `/app/billing` | `client/tenant/` | `billing.read`（结账/取消另需 `billing.write`） |
| 平台侧 | `/platform/billing` | `client/platform/` | 平台管理员 |

## 依赖

- `rbac`
- `audit`
- `platform`（webhook / 结账成功后调用 `updateTenantPlan` 回写套餐与配额）

## 租户侧导航

`/app/billing` 归入沉底分组「系统管理」（与用户管理、角色权限同组，`placement: end`），
不单独占主区「设置」分组，避免日常业务与治理入口被割裂。

## 启用

在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 与 client 同名文件注册。

## 配置

| 变量 | 说明 |
| --- | --- |
| `CREEM_API_KEY` | Creem API Key；空则无法发起 checkout |
| `CREEM_WEBHOOK_SECRET` | Webhook 验签密钥 |
| `CREEM_STORE_ID` | 默认 `sto_1xa3pu52PWClO5EruTHs86` |
| `CREEM_SERVER` | `test` \| `prod` |
| `CREEM_PRODUCT_MAP` | JSON：`plan_slug → prod_*`，如 `{"starter":"prod_xxx"}` |

Webhook URL：`POST /api/billing/webhooks/creem`（免 JWT，校验 `creem-signature`）。

## 官网段 `billing.plans`

产品站的定价区：`billing` 向 marketing 贡献一个段（同 `site-member` 的路子），
在主题编辑器「添加区块」里叫「套餐」。

**排版与文案归租户，价格与套餐名归代码**：租户挑哪几档、排顺序、写卖点、改按钮文案；
价格从 `PRICING_PLANS` 取、套餐名从 `platform` 的 locale JSON 取（`planName(slug, locale)`）。
段的 settings 里没有价格字段——「官网写 ¥99、结账收 ¥399」这类事故从配置面上就杜绝了。

CTA 是一条普通链接（默认 `/register`）：SSR 渲染的是公开页，服务端不知道访客登没登录
（工作台会话在另一个 Host 上），做不出「已登录去升级」的分支，也就别装作能做。

## 扩展点

- 权限：`billing.read` / `billing.write`
- 官网段：`billing.plans`（`entitlement: billing`）
- 审计：`BILLING_CHECKOUT_CREATE` / `BILLING_SUBSCRIPTION_CANCEL` / `BILLING_WEBHOOK_SYNC`
- Entitlement：`billing`（默认开启）
- Provider：`shared/payment-provider.ts`；实现见 `server/providers/creem.provider.ts`

## 如何单独测试

单元测试：

```bash
pnpm --filter modules exec vitest --run --project 'billing/*'
```

### 本地完整流程（Checkout → Webhook → 改套餐）

Webhook 必须打到 **API `:3700`**，不要隧道前端 `:7300`。

1. `.env.local` 配置 `CREEM_*`（`CREEM_SERVER=test`；`CREEM_PRODUCT_MAP` 使用 Dashboard 里的 `prod_…` ID）
2. `pnpm dev`
3. 公网隧道：

```bash
ngrok http 3700
```

4. Creem Dashboard（Test Mode）→ Webhooks，Endpoint：

```
https://<ngrok-host>/api/billing/webhooks/creem
```

Secret 与 `CREEM_WEBHOOK_SECRET` 一致；改 env 后重启 server。

5. 浏览器 `http://localhost:7300/app/billing` 升级并用 test 卡付款。  
   开通以 webhook 为准（日志 `[billing] creem webhook processed`）；`?checkout=success` 只是回跳，
   页面读到它会显示「正在开通」并轮询订阅（最多 30s），到账后自动刷新套餐卡。

## 两条容易踩的口径

- **订阅进终态后不要直接降级**：一律走 `reconcileTenantPlan(tenant_id)` 按**剩下还生效的**
  订阅重算。升档的正常路径就会触发旧订阅的 `subscription.canceled`——无条件降到 free 会让
  刚付完钱的组织当场失权。
- **webhook 落库走 `upsert`**，唯一键含 `tenant_id`（`@@unique([tenant_id, provider, …])`）。
  重投与并发是常态，先查再建会撞唯一键 → 400 → 通道反复重试。tenant-guard 认得复合唯一键里的
  `tenant_id`（`findTenantPredicate`），所以租户隔离照旧生效。

角色需 `billing.read` / `billing.write`（系统管理员自带）。商品建议用 **recurring**，纯 `onetime` 可能收不到完整 `subscription.*` 事件。
