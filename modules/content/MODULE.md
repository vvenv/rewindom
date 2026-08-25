# content

外部模块：用图片、视频和文字生成笔记与文章。一期只做生成与编辑，不对接小红书 / 公众号发布。

## 定位

- 独立 workspace 包（`modules/content/`），包名 `@rewindom/content`
- 所有内核 API 通过 `@rewindom/module-sdk` 门面包访问
- 体裁用中立的 `note` / `article`，后续发布渠道再映射

## 结构

```
content/
├── MODULE.spec.yaml
├── features/                 # 增量功能契约（FEATURE.spec）
├── prisma/schema.prisma      # Content + ContentAsset + ContentTemplate
├── shared/                   # API 类型、字段模型与校验、内置预设、entitlement
├── server/                   # CRUD、模板 CRUD、素材上传、LLM 生成
└── client/
    ├── pages/contents.tsx
    ├── pages/content-detail.tsx
    ├── pages/content-templates.tsx
    ├── components/
    └── locales/
```

## 面划分

| 面     | 路由                                                                   | 目录      | 所需权限                                       |
| ------ | ---------------------------------------------------------------------- | --------- | ---------------------------------------------- |
| 租户侧 | `/app/contents`、`/app/contents/templates`、`/app/contents/:contentId` | `client/` | `contents.read`（写操作另需 `contents.write`） |

模板管理**不占侧栏**，从列表页右上角进。一个模块一项，为一个配置页多挂一条会把导航稀释掉。
路由里 `templates` 排在 `:contentId` 前面，否则会被当成一个 contentId。

## 创作模板（SOP）

租户自己定义「每次要填什么、怎么写、写成什么样」，产出风格才稳得住。一个模板三部分：

| 部分            | 存在哪                       | 去了 prompt 的哪                         |
| --------------- | ---------------------------- | ---------------------------------------- |
| 输入字段表      | `ContentTemplate.fields`     | 用户填完变成 user message 的「标签：值」 |
| 写作规则        | `ContentTemplate.guidelines` | system prompt 追加段                     |
| 输出约束 + 范文 | `output_rules` / `samples`   | system prompt 的硬要求段与风格参考       |

几条已经踩过的坑，改之前先读：

**字段模型自己定一份，不 import site-form。** 那份定义挂在 marketing 的 section schema 与
block 体系上，依赖过去等于为了省一个 interface 把两个限界上下文焊死。这里只要
text / textarea / select / tags 四种，比表单段薄得多。校验的单一真相源是
`shared/content-template.ts` 的 `validateBriefValues`，两端共用。

**填写记录存 `[{ id, label, value }]`，不是 `{ fieldId: value }`。** 与 site-form 同一条理由：
租户随时会改标签、删字段、调顺序，按 id 存的话三个月后回头看只剩一堆对不上的 uuid。
`Content.brief` 因此降级成**派生列**——由 `brief_values` 重算，只为让列表关键词搜索有得可搜。

**内置预设是代码里的只读常量（`shared/template-presets.ts`），不种进库。** 种进库就够不到
已经种下去的那份了。租户复制一份成为自己的模板，`preset_key` 只标来源，**不跟随预设更新**。

**填写用快照，规矩用现值。** 重新生成时现取一次模板：模板改了就该按新规矩来，那正是定
SOP 的意义。填写记录反过来，用当时存下的那份。

**删模板不动已用过它的内容。** `brief_values` 自描述，模板没了照样读得懂；悬空的
`template_id` 只让「按这个模板重填」不可用。

模板读写复用 `contents.read` / `contents.write`，不另开权限键。

## 生成

`POST /api/contents/:content_id/generate` 立即把状态打成 `generating` 后返回；后台调用租户 LLM。图片以视觉输入喂给模型；视频只带文件名，不逐帧分析。未配置 API Key 时失败码 `content.llm_not_configured`。

system prompt 由 `buildSystemPrompt` 三段拼成：体裁基础提示 + 模板写作规则 + 输出约束（含范文）。
**风格上的数字不写在基础提示里**，全部落到 `DEFAULT_OUTPUT_RULES`——写死在基础提示里的话，
租户把标题定成 20 字，prompt 里会同时出现「max 40」和「at most 20」，模型听哪条全看运气。
基础提示那一段租户改不到：JSON 输出契约被改坏，整条链路会失败。

进程重启后，超过 15 分钟仍为 `generating` 的记录会在 `onBoot` 标为失败。

## 常见改动

- 加发布渠道：走 `extend-module`，不要把平台 SDK 写进本包的生成路径
- 加素材类型：先扩 `CONTENT_ASSET_KINDS` 与 MIME 白名单（视频还要同步 `mime.ts`）
- 加字段类型：扩 `CONTENT_FIELD_TYPES`，同时补 `normalizeTemplateFields` 的兜底、
  `validateBriefValues` 的校验、`ContentBriefFields` 的控件——三处缺一处就会漂
- 加内置预设：只改 `shared/template-presets.ts`，两种语言都要给；**不要**写迁移去种库

## 依赖

- `rbac`
- `audit`

## 如何单独测试

```bash
pnpm --filter @rewindom/content test
```
