# module-billing

## 用途

租户自助管理订阅与付款；平台侧查看跨租户订阅/付款。首期通过抽象 Payment Provider 接入 Creem。

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

## 扩展点

- 权限：`billing.read` / `billing.write`
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
   开通以 webhook 为准（日志 `[billing] creem webhook processed`）；`?checkout=success` 只是回跳。

角色需 `billing.read` / `billing.write`（系统管理员自带）。商品建议用 **recurring**，纯 `onetime` 可能收不到完整 `subscription.*` 事件。
