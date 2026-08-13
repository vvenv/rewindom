# @rewindom/ui

基于 shadcn/ui 的基础 UI 组件库与 toast 通知。

## 职责

- Button、Dialog、Sheet、Select、Table 等 Radix/shadcn 封装
- `toast`（sonner）
- 样式工具（`cn`、CVA variants）

## 使用

```typescript
import { Button } from "@rewindom/ui/button";
import { cn } from "@rewindom/ui/utils";
import { toast } from "@rewindom/ui/toast";
```

业务模块与 `client-shell` 应通过本包引用基础组件，避免在模块内重复安装 shadcn 依赖。

## 安装 / 更新 shadcn 组件

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name>
pnpm dlx shadcn@latest info          # 查看已安装组件
pnpm dlx shadcn@latest add <name> --dry-run --diff   # 预览变更
```

- CLI 配置：`packages/ui/components.json`（`#components` / `#lib` package imports）
- 主题 token 与 Tailwind `@source`：`apps/client/src/index.css`
- 从 `apps/client` 执行 `add` 时，UI 组件会路由到本包（`ui` → `@rewindom/ui`）

## 注意

- React 19 peer dependency
- 组件统一具名导出（named export）
