# Agent-first 开发框架

## 概述

be-water 的核心卖点之一是 **Agent-first**：框架为编码 Agent（Cursor、Claude Code 等）设计边界与闭环，使人与 Agent 能用同一套契约安全地扩展多租户 SaaS，而不是依赖「提示词碰运气」。

本文定义 **什么叫达成 Agent-first**、仓库里的真相源，以及对外口径。实现细节以代码与 Skills 为准；模块边界见 [modular-architecture.md](./modular-architecture.md)。

**相关入口**：

| 资产 | 路径 | 角色 |
| --- | --- | --- |
| Agent 根指令 | `AGENTS.md` | 约定速查、模块工作流、Skills/Rules 索引 |
| Cursor Rules | `.cursor/rules/*.mdc` | 始终生效的边界与命名 |
| Skills | `.cursor/skills/*/SKILL.md` | 任务剧本（`create-module` 等） |
| Claude Code Skills | `.claude/skills/` | 由 `pnpm sync-skills` 从 `.cursor/skills` 生成 |
| Spec 模板 | `.cursor/skills/create-module/templates/MODULE.spec.yaml` | 结构化输入；留空则追问 |
| 生成 / 校验 | `pnpm gen:module` · `pnpm check:modules` · `pnpm check:deps` | 机器可检查的闭环 |
| 模块说明书 | `packages/modules/*/MODULE.md` | 供人类与 Agent 的模块边界 |

---

## 1. 成功标准（卖点达成）

下列条件同时成立，才可对外宣称 Agent-first：

1. **有根指令**：克隆仓库后，Agent 能从 `AGENTS.md`（及 Claude 的 `CLAUDE.md` 指针）读到约定与工作流，无需口头复述架构。
2. **有任务剧本**：高频任务有 Skill（至少：建模块、拆模块、前端 Page 分层、Prisma 修复、migration 收敛、错误日志）。
3. **有结构化入口**：新模块走 `MODULE.spec.yaml` → `gen:module`，禁止 Agent 凭印象手改六处注册表。
4. **有机器闸门**：`check:modules` / `check:deps` / 租户 lint（fail-closed）能拦住越权与漏装配；CI 跑同一套。
5. **有金标准**：`notes`（及 `todos`）可复制；目录与 `MODULE.md` 固定，优先 AI 可读性。
6. **对外可讲清**：官网与公开文档能用同一闭环讲清楚（见 marketing `/docs/agent-first`），且不与「不是脚手架生成器」矛盾——卖的是**带闸门的模块化底座**，不是无约束代码喷发。

不在 Agent-first 范围内（勿与产品 AI 能力混淆）：

- 租户侧 LLM / BYOK（OpenAI 兼容客户端）属于**产品运行时 AI**，不是编码 Agent DX。
- 不承诺任意 Agent 零监督完成复杂域建模；复杂业务仍由人审 Spec 与 service 逻辑。

---

## 2. 闭环（人与 Agent 共用）

```text
意图 → 填 MODULE.spec.yaml（Skill 拦猜测）
     → pnpm gen:module <spec>
     → 补 service / UI / migration
     → pnpm check:modules && pnpm check:deps
     → 人工验收业务语义
```

| 步骤 | 人做什么 | Agent 做什么 |
| --- | --- | --- |
| Spec | 拍板 id、权限、entitlement、模型字段 | 按 Skill 追问缺口，不擅自填业务假设 |
| 生成 | 确认 diff | 跑 `gen:module`，不手改注册表 |
| 实现 | 审领域逻辑与 UX | 按 `notes` / Page 分层 Skill 补齐 |
| 校验 | 看失败原因 | 修到 `check:modules` / `check:deps` 绿 |
| 提交 | 最终把关 | 遵循约定；不 `--no-verify` |

---

## 3. 设计原则（相对「AI 友好」的升级）

`modular-architecture.md` 已要求 **AI 可读性**（固定目录、`MODULE.md`）。Agent-first 在此之上强调：

| 原则 | 含义 |
| --- | --- |
| **指令即产品** | Rules / Skills / AGENTS.md 是交付物的一部分，不是可选文档 |
| **生成代替记忆** | 易漏的装配点由 `gen:module` 写入，不靠 Agent 背清单 |
| **校验代替信任** | 边界用 CI 与 lint 强制，不靠「模型应该记得」 |
| **Spec 代替闲聊** | 结构化 YAML 是模块意图的契约；闲聊补全必须回写 Spec |
| **双 IDE 同源** | Cursor Rules + Claude Skills 同源；只改 `.cursor/skills/` |

---

## 4. 维护清单

改 Agent 面时同步：

- [ ] 新 Skill → 只加 `.cursor/skills/`，`prepare` / `pnpm sync-skills` 同步 Claude
- [ ] 新硬约束 → 优先 Rule 或 `check:*`，再写进 AGENTS.md 速查
- [ ] 闭环变更 → 更新本文、`AGENTS.md`、官网 `content/docs/05-agent-first.md` 与首页 Agent 区块文案
- [ ] 对外口号 → `packages/modules/marketing` 的 i18n / `shared/site.ts` / `shared/features.ts` 保持一致

---

## 5. 对外口径（一句话）

**be-water 是 Agent-first 的多租户 SaaS 模块化单体：用 AGENTS.md、Skills 与 gen/check 闭环，让编码 Agent 在强制边界内扩展业务，而不是在无约束仓库里碰运气。**
