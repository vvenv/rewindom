# todo

外部模块：租户内待办清单（TodoMVC 风格）。

## 定位

- 独立 workspace 包 `@be-water/todo`（`modules/todo/`），非内部模块
- 所有内核 API 通过 `@be-water/module-sdk` 门面包访问——不直接 import `server-kernel` / `client-kit` / `shared`
- 边界由 `verify-module.mjs` 的 `checkBoundary` 强制

## 用途

租户内待办清单

## 面划分

| 面     | 路由     | 目录      | 所需权限                                 |
| ------ | -------- | --------- | ---------------------------------------- |
| 租户侧 | `/app/todos` | `client/` | `todo.read`（写操作另需 `todo.write`） |

## 权限控制

四处必须同时收窄，缺一处就会出现「看得见点不进」或「点得进但请求 403」：

| 位置         | 文件                                                      | 收窄方式                                  |
| ------------ | --------------------------------------------------------- | ----------------------------------------- |
| 路由         | `server/todo.routes.ts`                                   | `app.requirePermission`                   |
| 导航项       | `client/tenant/nav-sections.ts`                           | `anyPermission: ["todo.read"]`           |
| 页面路由     | `client/tenant/routes.tsx`                                | `PermissionRoute permission="todo.read"` |
| 页面内写操作 | `client/pages/todos.tsx`、`client/components/TodoRow.tsx` | `hasPermission("todo.write")`            |

## 交互参照 TodoMVC

页面交互按 <https://todomvc.com/examples/typescript-react/> 对齐；脚手架那套通用 CRUD
（表格 + 抽屉新建/编辑 + 每步确认弹窗）已整体替换：

| 行为            | 实现                                                                 | 文件                          |
| --------------- | -------------------------------------------------------------------- | ----------------------------- |
| 新建            | 单行输入回车即建；空回车静默忽略；先清空输入再发请求，失败把原文放回 | `components/TodoQuickAdd.tsx` |
| 一键全选/全不选 | 输入行左侧复选框；全部完成时勾上，再点即全部标未完成                 | `components/TodoQuickAdd.tsx` |
| 勾选完成        | 行内复选框直接写库；已完成的标题加删除线压暗、勾选框也压成灰调       | `components/TodoRow.tsx`      |
| 就地改标题      | 双击标题进编辑；Enter / 失焦保存，Esc 放弃，清空即删除该条           | `components/TodoRow.tsx`      |
| 删除单条        | hover 出 ×，点了立即删除不弹确认，toast 里给「撤销」                 | `hooks/useTodoActions.ts`     |
| 页脚            | 「剩余 N 项」+ 全部/未完成/已完成 + 清除已完成（有已完成才出现）     | `components/TodoFooter.tsx`   |

几处刻意的偏离与理由：

- **单条删除不确认，但「清除已完成」保留确认**：前者一次一条且可撤销；后者一次抹掉多条，
  逐条重建的撤销不划算，宁可拦一道。撤销走「按原标题 + 完成态重建」，**id 会变**。
- **× 在小屏常驻显示**（`md:opacity-0 md:group-hover:opacity-100`）：触屏没有 hover，
  纯 hover 显示等于在手机上把删除藏死。
- **保留搜索框与分页**：TodoMVC 没有这两样，但这是租户后台，清单会长到几百条。
  搜索与三段筛选一起放页脚，分页只在 `page_count > 1` 时出现。
- **默认排序改成 `created_at asc`**：TodoMVC 语义是勾完成不改变行的位置。
  早先的「已完成沉底」配合就地勾选，会让刚点的那行跳走，手要重新找位置。

## 相对生成物的其它偏离

| 处                       | 改法                                                               | 原因                                   |
| ------------------------ | ------------------------------------------------------------------ | -------------------------------------- |
| `server/todo.service.ts` | 列表额外返回 `active_count` / `completed_count`                    | 页脚计数要跨分页、且不受完成态筛选影响 |
| `server/todo.routes.ts`  | 新增 `completed` 筛选参数、`DELETE /completed`、`POST /toggle-all` | 支撑三段筛选、清除已完成、一键全选     |

新增审计动作 `TODO_CLEAR_COMPLETED`、`TODO_TOGGLE_ALL`（manifest 已登记）。
覆盖手写行为的测试：

- `server/todo.routes.test.ts`：筛选参数透传、静态路由优先于 `/:todo_id`、`toggle-all` 的布尔
  校验（漏传 `completed` 会静默把全部标成未完成）、权限收窄
- `client/components/TodoRow.test.tsx`：就地编辑的四条收尾规则、× 不弹确认、只读用户看不到写入口
- `client/lib/todos.test.ts`：`resolveTodoTitleEdit` 的判定表

## 边界规则

外部模块**只许** import 自：

- `@be-water/module-sdk` — shared 契约（无框架依赖，安全在任何上下文用）
- `@be-water/module-sdk/server` — server 契约 + server-kernel 运行时（仅 server 代码用）
- `@be-water/module-sdk/client` — client 契约 + client-kit 运行时（仅 client 代码用）
- `@be-water/ui` — UI 原语
- 第三方库（react / react-router / lucide-react / react-i18next / fastify 类型 等）

## Prisma 类型推导

外部模块不直接 import 生成的 Prisma client 类型（那在 `@be-water/server-kernel/generated/` 下，属于禁止路径）。
mapper 通过 `typeof prisma` 推导记录类型：

```typescript
import { prisma } from "@be-water/module-sdk/server";
type TodoRecord = NonNullable<Awaited<ReturnType<typeof prisma.todo.findFirst>>>;
```

## 审计动作

外部模块直接用字符串字面量：

```typescript
await emitAuditLogFromRequestSafe(app.events, app.log, request, {
  action: "TODO_CREATE",  // 字符串字面量，与 manifest.auditActions 声明一致
  ...
});
```

## 依赖

- `module-rbac`
- `module-audit`

## 如何单独测试

```bash
# 每个模块的 server / client / shared 各是一个 vitest project，
# 位置参数只按 project root 的相对路径过滤，跑全模块要用 --project。
pnpm --filter @be-water/todo exec vitest --run
```
