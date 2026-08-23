# mailer（发信通道）

横切基础设施：把「发一封邮件」这件事从各业务模块里抽出来，做成一个可替换的通道。
契约 `MailProvider` 住在**内核**（`packages/server-kernel/src/runtime/provider-contracts.ts`），
本包只是它的实现。

## 为什么是独立的 infra 包

`site-member`（builtin infra，会员验证邮箱 / 找回密码）与 `newsletter`（外部业务模块，
摘要投递）都要发信，而「infra 模块禁止 import 业务包」是硬规则。发信一旦埋进某个业务模块，
site-member 就够不着它——只能靠 Provider 反着注册，变成「基础能力要等某个业务模块启用了
才存在」。所以它按跨模块决策表的「可替换横切能力 → ProviderRegistry」那一行走。

**没有任何模块在 `requires` 里写 mailer**：消费方一律

```ts
const mail = app.registry.getMailProvider();
if (!mail || !(await mail.isConfigured(tenantId))) {
  // 没有发信能力：把依赖发信的入口收起来，不要假装能发
}
```

## 面划分

| 面       | 路由                                             | 目录                         | 所需权限                                   |
| -------- | ------------------------------------------------ | ---------------------------- | ------------------------------------------ |
| 租户侧   | `/app/mailer`                                    | `client/`                    | `mailer.read`（写操作另需 `mailer.write`） |
| 配置 API | `GET/PUT /api/mailer/config`                     | `server/mailer.config.ts`    | 同上                                       |
| 测试发信 | `POST /api/mailer/test`                          | `server/mailer.routes.ts`    | `mailer.write`                             |
| 投递记录 | `GET /api/mailer`、`GET /api/mailer/:deliveryId` | `server/delivery.service.ts` | `mailer.read`                              |
| 人工重试 | `POST /api/mailer/:deliveryId/retry`             | `server/mail.service.ts`     | `mailer.write`                             |

**投递没有 HTTP 入口。** 一封信只能由服务端调 `MailProvider.send()` 发出。开一个「发任意邮件」
的接口等于给后台账号一台开放中继，一旦某个角色被过度授权，这个站的发信域会被拿去发垃圾邮件，
然后整域进黑名单。唯一的例外是测试信——收件人由操作者自己填、正文写死。

## 配置：本站覆盖 > 平台 env

实现照抄 `packages/server-kernel/src/lib/tenant-llm.ts`：公开字段进 `TenantSetting.value`，
密码走 `secret` 列 + `tenant-secret-crypto` 加密，接口只回 status 不回明文。

合并是**逐字段**的，不是整体二选一：租户只想改发件人、继续用平台 SMTP 主机是常见诉求。
因此 status 同时回两组值——

| 字段                         | 含义                                        |
| ---------------------------- | ------------------------------------------- |
| `driver` / `from` / `smtp_*` | **本站覆盖的原值**，`null` = 该字段跟随平台 |
| `resolved_*`                 | 实际生效值                                  |

设置页用第一组预填、第二组做 placeholder。只回生效值的话，预填后一保存就会把平台默认
原样固化成本站覆盖，之后平台改配置这个站就跟不上了。

## 没有「免费兜底通道」

所谓免费额度（Resend / Brevo）仍然要平台管理员去注册、拿凭据、验域名——那就是这里的
平台默认，不是零配置。三档都没有时发信能力就是不可用，`isConfigured()` 返回 false，
调用方把入口收起来。

从服务器裸连收件方 MX 直投**不做**：云厂商基本封 25 端口，没有 SPF/DKIM 的信一律进
垃圾箱，等于白发，还会把域名声誉一起烧掉。

`log` driver 是开发环境的零配置默认（邮件全文进日志，不出网）。生产由 `buildMailConfig`
与 `parseDriver` 两道闸门挡着——在生产用它，等于所有确认信、退订信静默消失，
而设置页仍显示「已配置」。

## 失败不切通道

换 provider 就是换发信域和 IP，收件方当可疑源处理；而且主通道超时不代表没发出去，
换一家重发同一封 = 读者收两遍。所以：

- **同一通道**指数退避重试，梯度 1m / 5m / 15m / 1h / 6h（`mail.service.ts` 的 `BACKOFF_MS`）
- 5xx 响应码判永久失败，直接 `failed`；4xx 与无响应码当临时失败，继续重试
- 排队期间租户把配置清空了就落 `dropped`，不让它永远排在队里

## 幂等

`@@unique([tenant_id, idempotency_key])`。**靠数据库拦，不靠「先查再写」**——重试任务与
在线发信并发时，那道窗口正好会漏。撞键时不产生新行，直接回已有那一行的 id。

调用方必须给稳定的键。摘要投递用 `newsletter:{run_id}:{subscriber_id}` 这种形状；
测试信是唯一的例外（带时间戳，就是要能反复发）。

## 正文随记录一起存

不存就没法重试——重试任务醒来时调用方早已返回，拿不回当初那封信。代价是这张表会长，
保留期清理见 `MODULE.spec.yaml` 的 out_of_scope。

正文**不出现在任何 DTO 里**：邮件全文常含确认链接与退订 token，摊在运营页面上等于把它们
泄给每一个后台账号。收件人地址默认掩码，看全址要 `mailer.write`。

## 通道：SMTP vs Resend

|                 | `smtp` | `resend` | `log`            |
| --------------- | ------ | -------- | ---------------- |
| 能发信          | ✅     | ✅       | ❌（只写日志）   |
| 退信 / 投诉回调 | ❌     | ✅       | —                |
| 生产可用        | ✅     | ✅       | ❌（两道闸门拦） |

**Resend 也提供 SMTP 中继**（host=smtp.resend.com、user=resend、password=API key），
所以「能不能发信」不是做原生 driver 的理由。理由是 SMTP 是「交出去就结束」的协议：
信被拒了、进了垃圾箱、用户点了举报，我们一概不知道，投递记录会一直显示「已发出」，
而真实送达率在悄悄下滑，等发现时发信域已经被烧了。

API key 与 SMTP 密码**共用 secret 列**（语义都是「当前通道的密钥」）。新开一个
`resend_api_key` 字段的话，切换 driver 会留下一份用不上却同样敏感的旧密钥。
平台回落那侧是两个 env（`MAIL_RESEND_API_KEY` / `MAIL_SMTP_PASSWORD`），按 driver 取。

## 投递回调

`POST /api/public/mailer/webhook`。**不进 entitlement 网关，也不认租户 Host**——
机器对机器的固定地址，验签就是它的认证。租户关掉 mailer 之后在途的回调仍要记下来，
那是「关掉前最后几封为什么没送到」的证据。

| 口径                                              | 为什么                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| Svix 验签（HMAC-SHA256），失败一律 401 且不说原因 | 说「时间戳过期」还是「签名不对」等于给爆破者一个进度条           |
| 时间戳偏差 > 5 分钟直接拒                         | 否则抓到一次合法回调就能无限重放，把任意一封信标成 bounced       |
| 密钥在**平台级** env                              | 回调地址全站一个、没有租户上下文，按租户存的话不知道拿谁的密钥验 |
| 靠 `provider_message_id` 回找                     | 地址会重复（同一个人订几个列表），只有消息号一一对应             |
| 找不到记录 → 202 + info 日志                      | 可能对应保留期清理掉的老记录，那不是错误                         |
| `delivered` **不覆盖** bounced/complained         | 回调乱序到达是常态，后到的成功会把一条已知退信洗白               |

**只落数据 + 发领域事件，不做业务决定**：`mail.bounced` / `mail.complained` /
`mail.delivered`。「这个地址以后还发不发」是调用方的事——newsletter 要停发，
将来 site-member 的验证信可能只想提示用户换个邮箱。

## 如何单独测试

```bash
pnpm --filter @rewindom/builtin exec vitest --run --project 'mailer/*'
```

## 依赖

- `module-rbac`（权限）
- `module-audit`（配置变更、测试发信、人工重试留痕；投递本身不写审计——一次发信是业务记录，
  往审计流里再抄一份只会把「谁动了后台」冲淡）
- `module-platform`（provider 里读租户开关）
