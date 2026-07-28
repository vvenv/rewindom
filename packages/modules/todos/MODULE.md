# module-todos

由 `scripts/gen-module.mjs` 从 `MODULE.spec.yaml` 生成，**之后在 UI 与列表语义上做过手工定制**
（见下）。**不要直接 `--force` 重新生成**——会覆盖这些定制；改数据模型时请生成到别处再手工合并。

## 用途

租户内待办清单

## 面划分

| 面     | 路由     | 目录      | 所需权限                                 |
| ------ | -------- | --------- | ---------------------------------------- |
| 租户侧 | `/todos` | `client/` | `todos.read`（写操作另需 `todos.write`） |

## 权限控制

四处必须同时收窄，缺一处就会出现「看得见点不进」或「点得进但请求 403」：

| 位置         | 文件                                                         | 收窄方式                                  |
| ------------ | ------------------------------------------------------------ | ----------------------------------------- |
| 路由         | `server/todo.routes.ts`                                      | `app.requirePermission`                   |
| 导航项       | `client/tenant/nav-sections.ts`                              | `anyPermission: ["todos.read"]`           |
| 页面路由     | `client/tenant/routes.tsx`                                   | `PermissionRoute permission="todos.read"` |
| 页面内写操作 | `client/pages/todos.tsx`、`client/components/TodosTable.tsx` | `hasPermission("todos.write")`            |

## 相对生成物的手工偏离

脚手架产出的是通用 CRUD 交互（抽屉新建 + 搜索框），待办清单的惯用交互不是这样。改动如下：

| 处                                              | 改法                                                      | 原因                                                |
| ----------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `client/components/TodoQuickAdd.tsx`（新增）    | 单行输入 + 回车即建                                       | 只有一个标题字段，开抽屉填表单比直接敲字慢          |
| `client/components/TodoCreateSheet.tsx`（删除） | 被 QuickAdd 取代                                          | 页面不再有 FAB / 新建抽屉；编辑仍走 `TodoEditSheet` |
| `client/components/TodoFilters.tsx`             | 加「全部 / 未完成 / 已完成」筛选组 + 清除已完成           | 待办的核心筛选维度是完成态，不是搜索                |
| `client/components/TodosTable.tsx`              | 已完成标题加删除线并压暗                                  | 一眼区分待做与已做                                  |
| `server/todo.service.ts`                        | 默认排序改为复合：`completed asc` + `updated_at desc`     | 已完成的要沉底；单字段默认排序做不到                |
| `server/todo.service.ts` / `todo.routes.ts`     | 新增 `completed` 筛选参数与 `DELETE /api/todos/completed` | 支撑上面两项；批量清除是待办的标准操作              |

对应新增的审计动作 `TODO_CLEAR_COMPLETED`（manifest + audit 模块三处均已登记）。
`server/todo.routes.test.ts` 覆盖了这些手写行为：筛选参数透传、静态路由优先于 `/:todo_id`、权限收窄。

## 依赖

- `module-rbac`
- `module-audit`

## 如何单独测试

```bash
pnpm --filter @be-water/modules test --project todos/client
```
