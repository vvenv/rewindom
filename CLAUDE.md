# rewindom（Claude Code）

本仓库是 **Agent-first** 多租户 SaaS 底座。Claude Code 请以根目录 [`AGENTS.md`](./AGENTS.md) 为唯一约定入口。

- Skills：`.claude/skills/` → `.agents/skills/`（符号链接；**只改** `.agents/skills/`）
- 产品口径：[`docs/design/agent-first.md`](./docs/design/agent-first.md)
- 新模块闭环：填 `MODULE.spec.yaml` → `pnpm gen:module` → 补业务 → `pnpm check:modules`
