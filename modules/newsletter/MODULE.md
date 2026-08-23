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

| 面           | 路由                                                                                   | 目录                                | 门控                                                                                      |
| ------------ | -------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| 公开（JSON） | `POST /api/public/newsletter/subscribe`、`GET .../lists`                               | `server/public-subscribe.routes.ts` | 匿名；Host 认租户                                                                         |
| 公开（SSR）  | `/subscribe`、`/newsletter/confirm`、`/newsletter/unsubscribe`（GET 渲染 + POST 提交） | `server/newsletter.ssr.ts`          | 匿名；token 即凭证；路由自己 `resolveHostTenant`（`hostTenantContext` 只在 `/api*` 上有） |
| 官网段       | `newsletter.subscribe`                                                                 | `shared/sections/subscribe/`        | entitlement                                                                               |
| 公开站交互   | `client/enhance/index.ts`（由 site-enhance 扫进同一个 IIFE）                           | —                                   | —                                                                                         |
| 工作台       | `/api/newsletter`、`/app/newsletter`                                                   | `server/newsletter.routes.ts`       | `newsletter.read` / `.write`                                                              |

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

## 订阅段：订哪张表由租户在下拉里选

`list_key` 默认 `newsletter.all`（本站全部），候选来自 `registerNewsletterSource()`——
按请求的租户数据，编译期枚举不出来，所以走 `options_from` 运行时选项源
（`client/editor-context.ts`），段定义里的静态 `options` 只是拉不到时的兜底。

这也是「多个模块都提供订阅源时，段怎么知道自己对应哪一个」的答案：**它不推断**。
按页面上下文猜在 RSS 那种「一个链接指向一个 feed」的场景成立，但订阅段是租户主动摆上去
的内容块——摆在首页的订阅框该订什么，只有摆它的人知道。猜错的代价是读者收到一堆没想订
的东西，然后点「举报垃圾邮件」。

### 表单下面那一行：订的是什么 · 多久一封

两件事读者都**无处可查**：周期是租户在段设置里定的（表单上没有可选项），范围可能是从
主题页带过来的。所以渲染器常驻画一行「订阅范围：AI · 每天一封摘要」。

文案是**成品**（段渲染器拿不到 i18n），按 key 取：`contributed.newsletter.labels`
的 `scopes` / `cadences`（`server/section-context.ts` 与 `client/editor-context.ts` 各填
一份，形状相同）。为什么是表不是一句话——`SectionContextInput` 是**页面级**的，给不了
「这一段选了什么」，只能由段自己按 `list_key` / `cadence` 查。

`?list=` 指定的范围**盖过段设置**（读者的意图写在地址里，比站长配的默认更具体），
认不出的 key 一律当没传。这一条收在 section context provider 里而**不是**订阅页那条
路由里：`/subscribe` 走本模块的路由，`/zh-CN/subscribe` 走 marketing 的通用管线，
两条都得认——范围属于请求，不属于哪条路由。

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

## 贡献给「站点」的四样东西

| 贡献                           | 类型                             | 登记（**两端各一次**）                                |
| ------------------------------ | -------------------------------- | ----------------------------------------------------- |
| `newsletter.subscribe`         | 页面段                           | `registerSiteSectionHtml` + `registerSiteSectionView` |
| `newsletter.subscribe-link`    | chrome 块（singleton，默认页脚） | `registerChromeBlockHtml` + `registerChromeBlockView` |
| `newsletter.confirm-panel`     | 确认页必备段                     | 同上                                                  |
| `newsletter.unsubscribe-panel` | 退订页必备段                     | 同上                                                  |

**两端各登记一次是硬要求**：模块第一版只调了 server 侧的 `registerSiteSectionHtml`，
结果段能渲染但租户在 Theme Editor 的「添加区块」里根本找不到它——整个订阅功能没法启用。

chrome 块是**链接**不是内嵌输入框：页头页脚那一排寸土寸金，塞个 email input 会把版式
挤垮，还得带上提交/校验/回执三套状态。events 的 RSS 订阅走了两版才想明白「订阅是
站点级常驻入口而非页面内容」，这里直接抄结论。

## 两张模板页

确认页与退订页是租户可排版的模板页（`newsletter_confirm` / `newsletter_unsubscribe`），
与会员那三张同一套机制。kind 决定 slug，**租户改不了**——改了地址，已经发出去的邮件里
那些链接就全废了。`auto_init: false`：不给存量站点凭空多两张删不掉的空版式。

按请求的状态（token、这次点的结果、订了哪些列表）走 `contributed["newsletter"]`，
由本模块自己的 SSR 路由传给 `renderMarketingHtml`——这两张页不走 CMS 页面管线，
所以**不需要** `registerSectionContextProvider`。编辑器预览拿不到上下文，渲染器把
`undefined` 当表单态，那正是预览该显示的样子。

站点没发布、版式没落库都要能打开（`requireSite: false` + 预设兜底）：
退订不能因为站长把官网下线、或还没点过「初始化版式」就失效。

## 退信与投诉

上游是 mailer 广播的领域事件，**不反向 import mailer**（`requires` 里依然没有它）。

| 情形        | 处置                       | 为什么                                                     |
| ----------- | -------------------------- | ---------------------------------------------------------- |
| hard bounce | 一次就停发                 | 地址不存在，没有「过几天会好」这回事                       |
| soft bounce | **连续 3 次**才停          | 一次就停的话，对方邮箱满一天就永久丢掉一个真实读者         |
| 送达确认    | 清零计数                   | 「连续」二字的全部实现；放在「交给中继成功」那一刻是不对的 |
| 投诉        | 立刻停，且**绝不发通知信** | 往一个刚举报过你的人再发一封，等着第二次举报               |

**投诉过的地址不给一键恢复**（后端 409 + 前端不出按钮）：把这样的人重新加回名单，
法律与声誉上都是站长在给自己挖坑。要恢复得手工改库——故意做得比点一下麻烦。

停发原因常驻在名单列表里，与投递记录页把 `last_error` 摊在状态列旁边是同一条口径。

## 如何单独测试

```bash
pnpm --filter @rewindom/newsletter test
```

## 依赖

- `module-rbac`、`module-audit`、`module-marketing`
- 发信：`MailProvider`（经 ProviderRegistry，**不在 requires 里**）
