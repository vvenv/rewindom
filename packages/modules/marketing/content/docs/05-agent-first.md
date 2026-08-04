---
slug: agent-first
title: Agent-first
description: 用 AGENTS.md、Skills 与 gen/check 闭环，让编码 Agent 在强制边界内扩展业务。
---

## 为什么是 Agent-first

be-water 不只是给人看的模块化单体，更是给 **Cursor / Claude Code 等编码 Agent** 用的开发框架：边界写进 Rules 与校验器，任务写成 Skills，新模块走 Spec → 生成 → 机器闸门，而不是靠提示词碰运气。

设计口径见仓库内 `docs/design/agent-first.md`（开发者文档）；本页是官网可读的最短路径。

## 闭环三步

```bash
# 1. 填 Spec（模板在 .cursor/skills/create-module/templates/）
# 2. 生成骨架并完成注册表装配
pnpm gen:module path/to/MODULE.spec.yaml

# 3. 补业务逻辑后跑契约校验
pnpm check:modules
pnpm check:deps
```

`gen:module` 会写好容易漏的装配点（两处 `enabled-modules`、manifest、租户守卫、lint 清单、审计动作、Prisma 符号链接）。`check:modules` 是 Skill「交付前自检」的机器化版本。

## Agent 打开仓库后读什么

| 入口                           | 作用                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| `AGENTS.md`                    | 约定速查与工作流（Claude 另见 `CLAUDE.md` 指针）                  |
| `.cursor/rules/`               | 始终生效的边界（命名、租户、扩展点）                              |
| `.cursor/skills/`              | 任务剧本；Claude 侧由 `pnpm sync-skills` 同步到 `.claude/skills/` |
| `packages/modules/*/MODULE.md` | 单模块说明书                                                      |

## 与「不是脚手架」并不矛盾

Agent 可以写大量代码，但**不能**绕过租户 fail-closed、模块契约与依赖闸门。卖的是带强制边界的底座，不是无约束代码喷发。

## 下一步

- 本地跑起来：[快速开始](/docs/quickstart)
- 模块边界与注册表：[模块化架构](/docs/modules)
