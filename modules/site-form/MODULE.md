# site-form（站点表单）

官网上唯一**会往回写数据**的段，以及它收上来的东西。其余段都只是把 settings 画出来。

| 面                                       | 位置                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| 段定义 + 字段模型 + 校验（唯一真相源）   | `shared/sections/form/`                                                   |
| 段样式（真源 `.css`，assemble 生成常量） | `shared/site-css/form.css` → `shared/site-css.generated.ts`               |
| 公开提交                                 | `POST /api/public/site-form/submit`（匿名，靠 Host 认租户）               |
| 公开站交互                               | `client/enhance/index.ts`（由 marketing 的 site-enhance 扫进同一个 IIFE） |
| 工作台                                   | `/api/site-form/submissions`（列表 + 删一条）、`/app/site-form`           |
| 存储                                     | `SiteFormSubmission`                                                      |
| 租户开关                                 | `site-form`（`default_enabled: true`）                                    |
| 权限                                     | `form.read` / `form.write`                                                |

## 贡献给「站点」的是什么

段 type 是 **`site-form.form`**（带模块前缀，与 `shop.*`、`site-docs.*` 同口径）。定义、
HTML 渲染器、CSS 都住在本模块，marketing 只提供注册表：

| 面         | 登记                                                    | 在哪                                  |
| ---------- | ------------------------------------------------------- | ------------------------------------- |
| 实站 SSR   | `registerSiteSectionHtml`                               | `server/register.ts`（模块 `onBoot`） |
| 编辑器预览 | `registerSiteSectionView(def, htmlSectionView(render))` | `client/module.tsx` 顶层              |

预览**不另写一套 React**：公开站是 SSR HTML，预览灌同一个渲染器的输出，两边不会漂。

拆分前段 type 是没有前缀的 `form`，存量页面正文里存的就是它——由 marketing 解析层的
`SECTION_TYPE_ALIASES` 改写一次（`form` → `site-form.form`），**不扫 jsonb，也不双读**。

## 公开站交互（enhance）

公开站不挂 React。提交由 `client/enhance/index.ts` 导出的 `enhanceSite(ctx)` 拦截
`submit` 事件；marketing 的 `site-enhance/assemble.mjs` **扫目录发现**这个入口，拼进
同一个 IIFE。`ctx` 是当前页面的语言与路径快照，本模块不去认 marketing 的 DOM 约定。

改完脚本要重新 assemble（`pnpm --filter @rewindom/builtin assemble:site-enhance`），
生成物 `shared/site-enhance.generated.ts` 随提交入库。

## 提交口的几条硬口径

**字段表以已发布正文为准，不信客户端。** 提交时服务端按 `path` + `section_id` 现取那一段，
用它的 `field` block 重新算一遍字段表再校验：客户端想多送字段、改下拉选项、把必填改成
选填，都过不来。公开站的预校验调的是同一个 `validateFormValues`，所以两端口径不会漂。

**失败一律不透露细节**：段不存在、不是表单、站点没发布，对外都是 404；只有「字段填得
不对」逐字段返回，那是填表人自己要看的。限流按 `租户:IP`，**进程内**滑动窗口——挡的是
脚本猛灌，不是分布式刷量（那要 Redis 或网关层，等真出现再上）。

**提交不写审计日志**：那是匿名访客的正常写入，一次提交就是一条业务记录，再往审计流里
抄一份只会把「谁动了后台」冲淡。删除**要**留痕（提交里常有访客留的联系方式）。

**内容存成自描述的 `[{ id, label, value }]`**，不是 `{ fieldId: value }`：字段是 block，
租户随时会改标题、删字段、调顺序，按 id 存的话三个月后回头看只剩一堆 uuid 对不上任何东西。

## 工作台

`/app/site-form` 挂在侧栏「官网 CMS」分组下（`marketing:cms.navSection`），与页面、媒体
并列——提交是站点的一类内容集合。列表只有「时间 / 来源 / 内容」三列且不可排序：字段由
站长自己定义，列固定不了；提交恒按时间倒序，按访客填的内容排没有用途。

只读 + 删除，没有「改」——访客填过的东西不该被站方改写。
