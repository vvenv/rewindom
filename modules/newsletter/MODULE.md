# newsletter（邮件订阅）

官网上第二个**会往回写数据**的段（第一个是 `site-form.form`），以及它收上来的订阅关系。

## 本模块不认识内容来自哪里

这是整个设计的核心。newsletter 只认抽象的**列表**（`list_key` 字符串），谁往
`registerNewsletterSource()` 里登记，谁就成了可订阅的东西。events 是第一个消费者，
但本包里不会出现 events 三个字母——依赖单向：`events → newsletter`。

| 接触面   | 机制                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 订阅什么 | `NewsletterSource.listLists()`，注册表在 `shared/newsletter-source.ts`  |
| 推什么   | `NewsletterSource.listItemsSince()`，按游标拉，返回中立条目             |
| 在哪订   | 本模块自己贡献官网段 `newsletter.subscribe`，**贡献方一行 UI 都不用写** |

**拉，不推。** 摘要天然是拉：定时问 source「游标之后有什么」。推模式（贡献方发
EventBus 事件、本模块订阅）三条都不成立——每条内容一封信；EventBus 的约定是
「Handler 失败不阻塞发布方」，失败即丢信；补发和重放做不了。

发信也不是直接依赖：走 `app.registry.getMailProvider()`，所以 `requires` 里**没有
mailer**，编译期不 import 那个包。

## 面划分

| 面           | 路由                                                                     | 目录                                | 门控                         |
| ------------ | ------------------------------------------------------------------------ | ----------------------------------- | ---------------------------- |
| 公开（JSON） | `POST /api/public/newsletter/subscribe`、`GET .../lists`                 | `server/public-subscribe.routes.ts` | 匿名；Host 认租户            |
| 公开（SSR）  | `/newsletter/confirm`、`/newsletter/unsubscribe`（GET 渲染 + POST 提交） | `server/newsletter.ssr.ts`          | 匿名；token 即凭证           |
| 官网段       | `newsletter.subscribe`                                                   | `shared/sections/subscribe/`        | entitlement                  |
| 公开站交互   | `client/enhance/index.ts`（由 site-enhance 扫进同一个 IIFE）             | —                                   | —                            |
| 工作台       | `/api/newsletter`、`/app/newsletter`                                     | `server/newsletter.routes.ts`       | `newsletter.read` / `.write` |

公开口与两张 SSR 页**都不进 entitlement 网关**：那层要的是工作台的租户上下文，
而这里是访客。退订页尤其不能挂在开关后面——站长关掉订阅功能之后，存量订阅者手里
那些退订链接必须继续有效，否则他们只能去点「举报垃圾邮件」。

`/newsletter/*` 不在 `SITE_APP_PREFIXES` 里，所以它像普通 CMS 路径一样落到 Fastify，
静态路由比 marketing 的 `/:first/:second` 更具体会先命中——**不需要动 nginx / vite
那三份表**（site-member 的 `/member/*` 需要，是因为 `member` 在应用区前缀里）。

## 公开口的硬口径

**一律回 202，不区分「新订阅」和「这个地址早就订过了」。** 否则这个接口就是一个邮箱
枚举器：谁都能拿它验证某个地址是不是本站订阅者。确认信照发——已确认的地址改发一封
「你已经订阅了」而不是再给一个 token，对外表现一模一样。

**副作用只发生在 POST。** GET 只渲染一个带 token 的表单。邮件客户端和企业安全网关会
替用户预取邮件里的链接——GET 就落确认的话，扫描器点一遍等于用户确认了；退订更糟，
Gmail 的图片代理能把整个名单退光。

**无 JS 也要能确认和退订。** 两张页都是真 `<form method="post">`。订阅入口可以依赖 JS
（enhance 脚本），退订不行。

**退订 POST 不校验同源。** `List-Unsubscribe-Post` 的一键退订是邮件服务商的服务器发来的
POST，没有我们的 Origin。token 本身就是凭证（32 字节随机量），而且退订是「宁可多退，
不可退不掉」的操作。确认页则校验同源。

**提交不写审计日志**：匿名访客的正常写入，一次订阅就是一条业务记录，再往审计流里抄一份
只会把「谁动了后台」冲淡（与 site-form 同口径）。删除、导出、手动投递**要**留痕。

## 订阅段：留空即订阅本站全部

`list_key` 留空是**有意义的默认**——绝大多数站点只有一个内容源，站长把段拖上去就该
能用，不该逼他先去抄一串 `events:topic:ai`。想只订某一个列表时才填，key 在
`/app/newsletter` 的「可订阅列表」卡里能看到。

现在不做下拉选择器：候选来自 `registerNewsletterSource()`，是**按请求**的租户数据，
要用 `options_from` 就得再接一条 SSR 贡献上下文链路（shop 的分类选择器是那么做的）。
记在 MODULE.spec 的 out_of_scope。

## 双重确认与两个 token

| token               | 生命周期                     | 为什么                                                                       |
| ------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `confirm_token`     | 一次性，7 天过期，确认后清空 | 重放同一个链接不再生效                                                       |
| `unsubscribe_token` | **长期有效，永不清空**       | 它进每一封摘要的 `List-Unsubscribe` 头；读者半年后翻出旧邮件点退订也必须能退 |

两个字段不复用。`List-Unsubscribe` 与 `List-Unsubscribe-Post` 是 2024 年之后批量发信的
硬门槛，不是可选项——缺了它，读者只能点「举报垃圾邮件」。

## 摘要：游标，不是时间窗

「现在减去七天」在进程重启、任务漏跑、时钟漂移下都会算错，少发或重发；游标记的是
「上一轮取到哪条为止」。

一次组装、多份投递：同一组订阅者收到的正文相同，只有退订链接不同。幂等键
`newsletter.digest:{run_id}:{cursor}:{subscriber_id}`，真正拦重的是 mailer 侧的唯一索引。
**游标在投递之后才推进**——先推游标再投递的话，一次崩溃就会让这批内容永远发不出去；
宁可重发（幂等键会拦），不可漏发。

取数只做一次，用这一组里占多数的语言：条目标题是数据、不翻译（与 events 的 RSS 同口径），
所以多语言订阅者拿到的内容本来就一样，差别只在链接的语言前缀与邮件外壳文案，
外壳按每个订阅者自己的 locale 渲染。

## 如何单独测试

```bash
pnpm --filter @rewindom/newsletter test
```

## 依赖

- `module-rbac`、`module-audit`、`module-marketing`
- 发信：`MailProvider`（经 ProviderRegistry，**不在 requires 里**）
