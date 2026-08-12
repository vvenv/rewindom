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

**只在默认租户（产品站）可用**（`default_tenant_only`）。这一段卖的是这套部署自己的
套餐，摆到某个租户的站点上等于让访客在别人的站上买平台的东西。租户要在自己站上卖，
用的是自己那份数据——会员套餐（`site-billing.plans`），两份数据各归各的：

| 站点 | 套餐数据从哪来 | 配置入口 |
| --- | --- | --- |
| 默认租户（产品站） | 平台套餐 | `/platform/plans` |
| 其它租户 | 该站自己的会员套餐 | `/app/site-billing`；未配置则段不渲染 |

编辑器与 SSR 两道闸门都拦：菜单里不列（`sectionTypesFor` 的第 4 个维度），
渲染时不出（`renderSectionHtml` 的归属闸门，漏传按「非默认租户」算）。

**数据驱动 + 免配置**：段里既没有配数据的地方，也没有配价格写法的地方。

| 归谁 | 是什么 | 改在哪 |
| --- | --- | --- |
| 数据 | 展示哪几档、价格、币种、名称、说明、卖点、推荐哪档、排序 | 平台控制台 **/platform/plans**「套餐配置」 |
| 自动 | 价格符号与写法（`¥399` / `CN¥399`）、议价档文案 | `Intl.NumberFormat` 按访客语言现算 |
| 版式 | 抬头、显示/隐藏说明与卖点、按钮文案与去向、分栏留白底色 | 段的 settings |

改一次定价，所有摆了这一段的页面（各语言）自动跟着变。段里因此**没有** blocks
——那是第二份套餐数据；也**没有**价格前后缀——手填的前后缀换个币种或换个语言就会
集体失真，而 `Intl` 本来就知道人民币写「¥399」、美元写「$399」。

数据链路：平台控制台写 `AppSetting["plan_pricing"]`（只存被改过的字段，其余回落
`PRICING_PLANS` 与 `platform` 的 locale JSON）→ `getPlanCatalog()` 合并 →
`registerSectionContextProvider` 在渲染前把这一页要用的那份塞进 `contributed`。
段渲染器是同步的，自己查不了库；provider 只在页面真的摆了这一段时才跑，其余页面
一次查询都不发。

编辑器预览读同一份数据（公开接口 `GET /api/public/plans`，免认证——它本就印在
公开定价页上），所见即访客所见。

CTA 是一组管所有卡的链接（默认 `/register`）：按钮去哪儿是**页面**的事，不是某一档
套餐的属性。SSR 渲染的是公开页，服务端不知道访客登没登录（工作台会话在另一个
Host 上），做不出「已登录去升级」的分支，也就别装作能做。

## 扩展点

- 权限：`billing.read` / `billing.write`
- 官网段：`billing.plans`（`entitlement: billing`；数据来自平台控制台的套餐配置）
- 审计：`BILLING_CHECKOUT_CREATE` / `BILLING_SUBSCRIPTION_CANCEL` / `BILLING_WEBHOOK_SYNC`
- Entitlement：`billing`（默认开启）
- Provider：`shared/payment-provider.ts`；实现见 `server/providers/creem.provider.ts`

## 如何单独测试

单元测试：

```bash
pnpm --filter @be-water/builtin exec vitest --run --project 'billing/*'
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
