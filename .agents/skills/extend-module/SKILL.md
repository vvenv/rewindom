---
name: extend-module
description: 在已有模块上增量开发（加字段、路由、页面、权限、包内子域）。扩展现有域时使用；新建物理包用 create-module。
---

# 扩展已有模块

Rule：`.cursor/rules/extension-points.mdc`
设计文档：`docs/design/modular-architecture.md`（§3.4、§11.2、§11.4）
模板：`templates/FEATURE.spec.yaml`

**不要**用本 Skill 新建 `modules/<id>/` 或 `packages/builtin/<id>/`——那是 `create-module`。
官网段 / chrome 块 / 模板页转到 `site-section`。

## 何时使用

- 已有 `modules/<id>/` 或 `packages/builtin/<id>/` 上加模型字段、API、页面、权限、包内子域
- 用户说「给商店加…」「在笔记里加…」而该模块已存在
- 模块已偏离 `gen:module` 生成物（多模型、SSR、贡献段），不能再 `--force` 覆盖

## 第 0 步：收集输入（缺项必须问，禁止猜）

1. 打开该模块 `MODULE.md`（尤其 **「常见改动」** 表，若有）
2. 填一份 FEATURE.spec。用户已提供 → 校验必填项后开工；未提供 → 按下表补齐再动手
3. 落盘为 `<module>/features/<slug>.spec.yaml`，**与本次改动一起提交**（契约，不是会话草稿）

### 必问项（猜错要跨文件返工）

| 字段 | 影响面 | 猜错的代价 |
| --- | --- | --- |
| `module` | 改哪个物理包 | 改错包、跨限界上下文写 |
| `surfaces` | 工作台 `/app/*` vs 公开 SSR vs 会员 vs 平台 | 改错面（店面需求去改工作台） |
| `goal` | 一句话范围 | 做多或做少都无法验收 |
| `gold` | 抄哪个实现 | 复制不像的模板，后期重构 |
| `touch` | 允许改的路径 | 顺手改到 `out_of_scope` |
| `out_of_scope` | 明确不做 | 牵连 checkout / billing / 内核 |
| `i18n` | `code` / `data` / `none` | 内容字段做成 `fieldTitleEn` |
| `acceptance` | 怎么算做完 | 只改代码不跑 `check:*` |

### 可跳过（不必写 FEATURE.spec）

单文件笔误、纯文案、已有 key 的 i18n 补译。

跨文件 / 新字段 / 新路由 / 新段 / 新权限 → **必须先填**。

### 可默认项（不要问；在最终回复里列出）

| 项 | 默认 |
| --- | --- |
| `entitlement` / 现有 `permissions` | 沿用模块现有；不新增则 spec 里留空 |
| `models` | 无新字段则留空 |
| 租户工作台 path | 必须 `/app/<模块>/…` |
| 页面外壳 | 按 `frontend-page-structure` |

### 追问节奏

一次最多 4 题：先 `module` + `surfaces` + `goal`，再 `gold` / `touch` / `out_of_scope` / `i18n`。

### 硬规则

- 必问项缺失且用户未回答 → **停，不写代码**。禁止「先改着回头补 spec」。
- 实现过程要扩大 `touch` → **先改 spec 再动手**，不要默默越界。
- 用户答案与仓库约定冲突 → 按 AGENTS.md「前置约束」先给最佳实践再确认。
- 已注册模块 **不要** 再手改两处 `enabled-modules.ts`（那是新建物理包才碰的）。

## 实现清单（按需，不一次全做）

对照 FEATURE.spec 的 `goal` / `touch` 勾选。

### 新模型 / 字段

1. 改模块内 prisma（`modules/<id>/prisma/schema.prisma` 或 `packages/builtin/<id>/models.prisma`）
2. `pnpm --filter server exec prisma migrate dev --name <name>`（开发库不可信时走影子库，见 AGENTS.md）
3. mapper + 表单 + 表格列 + 服务端 `sort_whitelist`（可排序列必须 ⊆ 白名单）
4. 新 `tenant_id` 模型 → `tenant-guard.ts` 的 `MODEL_POLICIES` + `eslint-rules/tenant-models.json`

### 新权限

四处必须同时收窄，缺一处就会「看得见点不进」或「点得进但 403」。抄该模块 `MODULE.md`「权限」或 `modules/note/MODULE.md`：

| 位置 | 收窄 |
| --- | --- |
| 路由 | `app.requirePermission` |
| 导航 | `anyPermission` |
| 页面路由 | `PermissionRoute` |
| 写按钮 | `hasPermission`；无权限时 `action={null}` |

权限在 server manifest `shared.permissions` 声明。写操作走 `events.emit('audit.log', …)`。

### 新页面

走 `frontend-page-structure`。租户 `renderRoutes` 的 path **必须** `/app/<模块>/…`。

### 包内子域

紧耦合子域（如 shop 的 `catalog/` / `cart/`）只加目录与 entitlement slice，**不**新建 npm 包、**不**手改 `enabled-modules.ts`。

1. `server/<subdomain>/`、`client/` 下页面、`shared/` 类型
2. 若需租户开关：模块 `shared/entitlements.ts` 追加 slice，server 用 `registerTenantGatedRoutes`
3. 在已有 `server/module.ts` / `client/module.tsx` 追加注册

### 官网段 / 模板页 / chrome 块

转到 **`site-section`**。

## 交付

- [ ] FEATURE.spec 已落盘且 `touch` 与 diff 一致
- [ ] `node scripts/verify-module.mjs <id>`（或 `pnpm check:modules`）
- [ ] spec 里的 `acceptance` 命令已跑绿
- [ ] 约定变了 → 回写该模块 `MODULE.md`（常见改动 / 面划分 / 权限）
- [ ] 租户侧 / 公开面文案无「租户」「Tenant」
- [ ] 新内容字段走数据 locale map，不要 `fieldTitleEn`

## 禁止

- 用本 Skill 跑 `pnpm gen:module` 或 `--force` 覆盖已手工演进的模块
- 为「目录整齐」拆新物理包
- 扩大 `touch` 却不改 spec
- 改店面却去动工作台 `client/pages`（或反过来）——先看 `MODULE.md`「常见改动」
- 业务模块 import `billing` 做卖货收款（shop 与订阅分开）
