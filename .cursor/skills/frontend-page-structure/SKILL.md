---
name: frontend-page-structure
description: 前端页面外壳（租户页必须用 PageLayout）与 Page 四层拆分（Page/Hook/Lib/Component）。**新建任何 client 页面时都要用**，不限于复杂页面；重构既有页面时同样适用。
---

# 前端 Page 分层

Rule：`.cursor/rules/frontend-page-structure.mdc`

## 何时使用

- **新建 `pages/` 下的任何页面**——哪怕只有 30 行，也要先按「第 1 步」选对外壳
- `pages/**/*.tsx` 超过 ~150 行（触发四层拆分）
- 同一文件混合：URL 参数、表格列、表单校验、mutation、空态 UI
- 用户要求「按 ChatHome 模式优化」

> 外壳约束（`PageLayout`）与体量无关；四层拆分才看体量。早期版本只写了 150 行门槛，
> 导致新建的小页面绕过了外壳约束——`/users`、`/roles` 都曾因此偏离金标准。

## 第 0 步：收集输入（缺项必须问，禁止猜）

新建页面前先取齐下面这些；随模块一起创建时，这些字段来自 `MODULE.spec.yaml` 的 `client.*`，
无需重复问用户。

### 必问项

| 字段                                                                    | 影响面                               | 猜错的代价                                   |
| ----------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------- |
| 挂载点（`renderRoutes` / `renderPlatformRoutes` / `renderGuestRoutes`） | 页面外壳                             | 租户页漏 `PageLayout`；平台页两个标题        |
| 路由 path + nav `label` / `title` / `icon`                              | 路由与导航                           | 漏 `title` → 移动端无标题                    |
| 页面形态（列表 / 表单 / 详情 / 仪表盘）                                 | 四层拆分的取舍                       | 结构走形，后期重构                           |
| 数据源 API + 表格列（哪些列、哪些可排序）                               | Data hook、`ColumnDef`、服务端白名单 | 排序列与服务端 `sort_by` 对不上 → 静默不排序 |
| 筛选项及其 URL 参数名（snake_case）                                     | page hook + `list-url-params`        | 参数名不一致 → 刷新丢状态                    |
| 写操作（新建/编辑/删除）及各自权限 key                                  | `*Dialog` / `*Sheet` + `action`      | 无权限用户看到禁用按钮                       |
| `PageLayout` 的 `title` / `description` / `icon`                        | 页面头部                             | 只能编，编了多半要返工                       |

一次最多 4 题，先问外壳与形态，再问列与操作。

### 可默认项（直接采用，不要问）

分页 20 + 服务端排序 + `keepPreviousData`；**Dialog/Sheet 内聚为金标准**（trigger + 弹层 +
表单 + mutation + toast 同一组件，`children` 作 trigger）；组件具名导出；
Lib 纯函数配 `*.test.ts`；无权限时 `action={null}`。

### 硬规则

- 挂载点未知 → **停下来问**，不要先写页面再补外壳：外壳选错会连带改 header、移动端标题、FAB。
- 表格可排序列必须回头核对服务端 `sort_by` 白名单；对不上就改一侧，不要两边各写各的。

## 第 1 步：选对页面外壳

**先定外壳再谈分层。** 取决于页面挂在哪个壳层——看模块 manifest 的 `client.*`：

| 挂载点                                   | 壳层                  | 页面外壳                                                            | 金标准                              |
| ---------------------------------------- | --------------------- | ------------------------------------------------------------------- | ----------------------------------- |
| `renderRoutes` / `renderSuperUserRoutes` | 租户 `AppLayout`      | **必须** `PageLayout`                                               | `notes/client/pages/notes.tsx`      |
| `renderPlatformRoutes`                   | 平台 `PlatformLayout` | **不要** `PageLayout`，直接 `<div className="flex flex-col gap-4">` | `platform/client/pages/tenants.tsx` |
| `renderGuestRoutes`                      | 无壳                  | `AuthPageShell`                                                     | `shell/pages/login.tsx`             |

租户页模板：

```tsx
export function Roles() {
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("roles.write");
  const { data, isLoading, isError, error, refetch } = useRoles();

  return (
    <PageLayout
      icon={ShieldCheck}
      title="角色权限"
      description="管理租户角色及其权限，成员通过被分配角色获得权限"
      action={
        canWrite ? (
          <RoleCreateSheet>
            <DraggableFabTrigger storageKey="roles_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">新建角色</span>
            </DraggableFabTrigger>
          </RoleCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">{/* 筛选栏 + 表格 */}</div>
    </PageLayout>
  );
}
```

- `action` 放的是**内聚的** `*CreateSheet`（不是裸 Button）；其 `children` 再传
  `DraggableFabTrigger`，一次声明覆盖桌面按钮与移动 FAB。
  `*CreateSheet` 须接受 `children` 作 trigger（`children ?? 默认 Button`），内部自含
  `open` / 表单 / mutation / `toast`——金标准见 `NoteCreateSheet`。
- 无权限时 `action={null}`，不渲染禁用按钮。
- `PageLayout` header 是 `hidden md:flex`，移动端标题由 `AppMobileHeader` 从**导航项的 `title`**
  解析（`resolve-mobile-header.ts`）——新增导航项别漏 `title`。
- 平台页再套 `PageLayout` 会出现两个标题（`PlatformLayout` 自带 `<header><h1>`）。

## 拆分步骤

1. **Lib** — 提取可单测纯函数
   - 表单：`validateXxxForm`、`buildXxxPayload`、`INITIAL_XXX`
   - 列表 URL：复用 `list-url-params`，勿重复 `parseInt(searchParams.get("page"))`
   - 域常量：筛选选项、格式化、图表数据转换
   - 添加 `*.test.ts`（Vitest）

2. **Hook**
   - `useXxxPage`：`useSearchParams`、filters、pagination、**sort**（`parseListSort` / `applySortingToSearchParams`）、detail id（如 `log_id`）
   - `useXxx`（数据）：queryKey 含 sort；传 `sort_by`/`sort_dir`；`placeholderData: keepPreviousData`
   - `useXxxForm`：表单 fields、受控更新、slug 联动等
   - `useXxxActions`：archive/delete/impersonate；内含 `confirm` + mutation + `toast`

3. **Component**（`components/<domain>/`）
   - 筛选栏、表格（含 `ColumnDef` + **`DataTableColumnHeader`**）、表单、空态/加载、Dialog 内容
   - 分页表：`sorting` / `onSortingChange` 透传 `DataTable`；`isLoading={isLoading && data.length === 0}`
   - 分页器：上下两个时上面用 `variant="simple"`（只有总数 + 上/下一页），每页条数与跳页只放下面那个；
     用 `DataTable` 即自动合规，自己摆分页器（如 `todos/TodoFooter`）才需要显式选 variant
   - 仅 props + 展示；不写 `useSearchParams`
   - **Dialog/Sheet 内聚（金标准）**：创建按钮（trigger）与含创建表单的 Sheet/Dialog
     是同一高内聚组件（如 `NoteCreateSheet`），不是列表 Page 里拆开的 Button + 底部弹层。
     组件内含 `open` + `*Trigger` + 表单 + mutation + `toast`；Page 不维护 `createOpen`

4. **Page** — 瘦编排
   ```tsx
   export function XxxPage() {
     const pageState = useXxxPage();
     const { data, isLoading } = useXxxQuery(pageState.filters);
     const actions = useXxxActions();
     return (
       <>
         <XxxFilters {...pageState} />
         <XxxTable data={data?.items ?? []} onRowClick={pageState.selectItem} />
       </>
     );
   }
   ```

| 向导 / 多区块页（如运费估算） | `Estimation` | `useEstimationPage` 等 | `estimationUtils` | `estimation/*` |

向导类租户页同样**必须** `PageLayout`（icon + title + description）；步骤条与业务 Card 放在 `children` 内，说明文字写入 `description` 而非额外 `<p>`。多 Card 区块用 `Card` + `CardHeader` 分组，避免与 `PageLayout` 标题重复。

## 产品升级检查（对齐 rewindom 时）

完整说明见 `docs/design/downstream-fork.md`。升级时**必查**这三类回归：

### 页面布局

- [ ] 所有 `renderRoutes` 租户页已套 `PageLayout`，无手写 `<p className="text-muted-foreground">` 页头
- [ ] 导航项 `title` 与 `PageLayout.title` 语义一致（移动端标题来源）
- [ ] 平台页未套 `PageLayout`

### Logo / favicon（从旧仓保留，勿被 rewindom 资产覆盖）

- [ ] `packages/client-kit/src/components/Logo.tsx` + `Wordmark.tsx` 已用旧版
- [ ] `apps/client/public/favicon.svg`（及 `manifest.webmanifest`）已用旧版；与 Logo 同几何
- [ ] `apps/client/index.html` 的 `<title>` / `apple-mobile-web-app-title` 已改
- [ ] `packages/shared/src/branding.ts`：`APP_DISPLAY_NAME` / `APP_TAGLINE` 已改；**勿改**有存量用户的 `STORAGE_PREFIX`

### 默认模块 / 路由（忽略禁用模块）

- [ ] `apps/client/src/home-path-candidates.ts`：业务首页在前，带门控的每项带 `tenantModule`（默认末位是无门控的 `/dashboard` 工作台兜底）
- [ ] 未启用的 `notes` / `todos` 已从 client/server `enabled-modules` 移除
- [ ] 导航项带 `tenantModule`（与 entitlement key 一致）；关闭模块后登录不会落到该路由

### 其它

- [ ] API 字段统一 `snake_case`（hooks/types 对齐 `@<product>/shared`）
- [ ] Vite `server.proxy` 读取根目录 `PORT`（`loadEnv`），勿硬编码端口
- [ ] Sheet/Dialog 正文含 `min-h-0 flex-1 overflow-y-auto px-4`
- [ ] 公开 API 与租户 API 错误分开展示（避免无关接口失败污染整页）

## 参考实现

| 场景             | Page              | Hook                       | Lib               | Components                                   |
| ---------------- | ----------------- | -------------------------- | ----------------- | -------------------------------------------- |
| 列表+筛选        | `Notes`           | `useNotesPage`             | `note-filters`    | `notes/*`                                    |
| 表格+URL+排序    | `Users`           | `useUsersPage`             | `list-url-params` | `users/UsersTable`                           |
| 平台日志+排序    | `ErrorLogs`       | `usePlatformErrorLogsPage` | `list-url-params` | `error-log/ErrorLogsTable`                   |
| 全量表客户端排序 | `Roles`           | —                          | —                 | `rbac/RolesTable`（`manualSorting={false}`） |
| 认证表单         | `Register`        | `useRegisterForm`          | `register-form`   | `auth/RegisterForm`, `AuthPageShell`         |
| 平台 CRUD 弹层   | `PlatformTenants` | —                          | —                 | `platform/CreateTenantDialog`                |

## Dialog / Sheet 内聚（金标准）

**原则**：创建 / 编辑类弹层 = trigger + 弹层 + 表单 + mutation + toast，装进**一个**组件。
列表 Page 只放置它，禁止把「新建按钮」和「创建 Sheet」打散在页面各处。

金标准参考：

| 角色 | 文件 |
| --- | --- |
| 内聚组件 | `notes/client/components/NoteCreateSheet.tsx` |
| Page 放置 | `notes/client/pages/notes.tsx` → `PageLayout.action` |

```tsx
// ✅ 高内聚：Page 只放置；Sheet 吃 children 作 trigger
<NoteCreateSheet>
  <DraggableFabTrigger storageKey="notes_create_fab">…</DraggableFabTrigger>
</NoteCreateSheet>

// ❌ 打散：Page 管 open + 头部 Button + 底部受控 Sheet
const [createOpen, setCreateOpen] = useState(false);
<Button onClick={() => setCreateOpen(true)}>新建</Button>
// …列表…
<NoteCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
```

### 检查清单

- [ ] Page 无 `*Open` state + 底部 `*Dialog` / `*Sheet`
- [ ] `*CreateSheet` / `*Dialog` 内含 `*Trigger`、表单、mutation、`toast`、关闭重置
- [ ] `PageLayout.action` 放的是内聚组件（`children` = `DraggableFabTrigger`），不是裸 Button
- [ ] 行内操作用 `children` 作 trigger；列表详情在 Row/Table 内聚
- [ ] 多步结果（如凭据）在同一 Dialog 内展示，不另挂 Page 级 Dialog
- [ ] 正文有 `px-4`（见下）

## Sheet / Dialog 正文内边距

`SheetContent` / `DialogContent` 只有 `flex flex-col gap-4`，**自身没有 padding**；
只有 `SheetHeader` / `SheetFooter`（Dialog 同理）内建 `p-4`。夹在中间的正文是你手写的节点，
不补 `px-4` 就会贴着抽屉边缘，且与上方标题、下方按钮左右不对齐。

```tsx
<SheetContent>
  <form className="flex h-full flex-col" onSubmit={handleSubmit}>
    <SheetHeader>…</SheetHeader>
    <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">…</FieldGroup>
    <SheetFooter>…</SheetFooter>
  </form>
</SheetContent>
```

- `px-4` 与头尾的 `p-4` 对齐；正文外若另包滚动 `div`，`px-4` 写在滚动层（参考 `rbac/RoleSheet`）
- `min-h-0` 保证 flex 子项能收缩后再滚动，否则 `overflow-y-auto` 不生效
- **不要加 `py-4`**：`SheetContent` 的 `gap-4` 已经隔开头/正文/尾
- ❌ `<FieldGroup className="flex-1 overflow-y-auto py-4">` — notes 模块曾如此，左右贴边

## 一页一表单

工作台页面**不要**上下叠两张 `<form>`、两颗保存。用户分不清该按哪一颗，回车会提交焦点所在的那张而不是整页。

| 页上留什么 | 第二份表单去哪 |
| --- | --- |
| 一项设置表单（货币、开关、报关编号…） | 收款密钥 / 通道配置 → **Sheet**（状态行仍可见） |
| 列表 | 创建 / 编辑 → `*CreateSheet` / `*Dialog`（已有内聚金标准） |

金标准：`site-billing` 的 `SiteBillingProviderStatusRow` + `SiteBillingProviderSheet`；shop `/app/shop/settings` 同构。

```tsx
// ✅ 页上只有一张设置表单；密钥在 Sheet
<ShopProviderStatusRow status={provider} canWrite={canWrite} />
<form onSubmit={handleSaveSettings}>…</form>

// ❌ 设置与 Stripe 密钥各一张 form、各一颗保存
<form onSubmit={handleSetting}>…<Button>保存</Button></form>
<form onSubmit={handleProvider}>…<Button>保存收款</Button></form>
```

收款通道的**状态**（钱进谁的账号、有没有配）必须留在页上，不能连同表单一起藏进 Sheet——否则结账失败要多点一次才看得到原因。

## 字段说明用气泡，不用常驻灰字

字段的**使用说明**（这项是什么、留空会怎样、怎么操作）挂 `FieldInfoTip`
（`@rewindom/client-kit`，标签后的 ⓘ；窄侧栏传 `side="left"`），不要用 `FieldDescription`
压在控件下面——一屏十来个字段各带两行灰字，控件全被挤到折叠线以下。

```tsx
<FieldLabel htmlFor="slug" className="flex items-center gap-1">
  路径
  <FieldInfoTip text={t("info.slug")} side="left" />
</FieldLabel>
```

`FieldDescription` / `FieldError` 只留给必须常驻可见的：校验错误、当前状态与不可用原因、
危险后果。同一字段不要两处都写。完整口径见 `ui-components` rule。

## 列表表格列排序

分页列表默认**服务端排序**，全链路约定见 `frontend-page-structure` rule。要点：

1. **Page hook**：`parseListSort` + `applySortingToSearchParams`（`sort_by` / `sort_dir`）
2. **Data hook**：`keepPreviousData`；API 传 `sort_by` / `sort_dir`
3. **Table**：`DataTableColumnHeader`；列 `accessorKey` = 服务端白名单字段名；操作列 `meta: { align: "right" }`（`DataTable` 内聚右对齐，单元格按钮 `flex gap-1`）
4. **Service**：`@rewindom/server-kernel/http/list-sort.js`（`parseSortDir`、`resolveSortField`、`resolveSortOrder`）
5. **无分页全量表**：`manualSorting={false}` + 组件内 `useState<SortingState>`

## 文案（租户无感知）

租户侧页面（`renderRoutes` / 绑定域名访客可见面）的 `title` / `description` / toast / 空态 **不要**出现「租户」「Tenant」。用「站点 / 官网 / 组织」或 `site` / `website` / `organization`。平台页（`renderPlatformRoutes`）可说租户。口径：`tenancy-mode` rule、`docs/design/tenant-config.md` §5.8。

## 检查清单

- [ ] 租户页用了 `PageLayout`（icon + title + description + action）；平台页没套
- [ ] 租户侧文案无「租户」「Tenant」（平台页除外）
- [ ] `action` 为内聚 `*CreateSheet`（`children` = `DraggableFabTrigger`），无权限时为 `null`
- [ ] 无 Page 级 `*Open` + 分散 Button / 底部 Sheet（Dialog/Sheet 内聚金标准）
- [ ] 新增导航项写了 `title`（移动端标题来源）
- [ ] Page 无 `ColumnDef`、无长 validator 函数
- [ ] URL 读写集中在 Hook + `list-url-params`（含排序时用 `parseListSort` / `applySortingToSearchParams`）
- [ ] 分页表：Data hook 用 `keepPreviousData`；Table 仅在 `data.length === 0` 时全页 loading
- [ ] 上下双分页器时，上方为 `variant="simple"`；单个分页器用默认 `full`
- [ ] 可排序列用 `DataTableColumnHeader`；服务端 `sort_by` 与 `accessorKey` 一致
- [ ] Sheet / Dialog 正文写了 `min-h-0 flex-1 overflow-y-auto px-4`
- [ ] Lib 新增逻辑有测试
- [ ] 组件具名导出（named export）
- [ ] 未扩大 scope（不顺手改无关文件）
- [ ] 同一页面没有两张 `<form>`（设置页尤其如此；密钥 / 收款通道用 Sheet）
