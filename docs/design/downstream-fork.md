# 产品仓升级到 be-water

将既有产品（moms / regora / shipest 等）对齐 be-water 底座时的检查清单。
be-water **独立维护**，不是可反复 `git merge` 的上游模板；升级是一次性对齐架构与约定。

Agent 执行时同步遵循 `frontend-page-structure` skill 的「产品升级检查」一节。

## 已知痛点（必须处理）

| 问题 | 现象 | 处理 |
| --- | --- | --- |
| 页面布局未对齐 | 租户页手写 `<div>` + `<p>` 页头，与 notes 不一致；移动端双标题 | 全部 `renderRoutes` 页套 `PageLayout` |
| Logo / favicon 被覆盖 | 登录页、侧栏、浏览器标签变成 be-water 品牌 | 从旧仓**保留/复制**品牌资产后再合入壳层 |
| 默认路由命中禁用模块 | 登录后进 `/app/notes` 或业务模块虽已关 entitlement 仍落地 | 在组装层配置 `HOME_PATH_CANDIDATES`，每项带 `tenantModule` |

---

## 1. 页面布局

租户页（`renderRoutes` / `renderSuperUserRoutes`）**必须**用 `PageLayout`：

- 金标准：`packages/modules/notes/client/pages/notes.tsx`
- 平台页（`renderPlatformRoutes`）**不要**套 `PageLayout`（`PlatformLayout` 已有 header）
- 导航项必须有 `title`（移动端 `AppMobileHeader` 标题来源）
- 向导/多区块页：说明文字进 `PageLayout.description`，不要额外 `<p className="text-muted-foreground">`

详见 Skill：`frontend-page-structure`。

---

## 2. Logo / favicon（保留旧版）

升级时先从**旧产品仓**拷回以下文件，再改壳层代码；不要直接用 be-water 的几何覆盖产品品牌。

| 资产 | 路径 |
| --- | --- |
| Logo 组件 | `packages/client-kit/src/components/Logo.tsx` |
| Wordmark 组件 | `packages/client-kit/src/components/Wordmark.tsx` |
| Favicon | `apps/client/public/favicon.svg` |
| PWA manifest | `apps/client/public/manifest.webmanifest`（若有） |
| HTML 标题 / apple title | `apps/client/index.html`（`<title>`、`apple-mobile-web-app-title`） |
| 展示名 / 副标题 | `packages/shared/src/branding.ts` 的 `APP_DISPLAY_NAME`、`APP_TAGLINE` |
| 登录 Hero（可选） | 业务模块 `shell.authLoginHero`，覆盖默认中性文案 |

**注意**：`STORAGE_PREFIX` 参与 token 的 localStorage key。若产品已有线上用户，**不要**改成与旧版不同的值，否则全员掉线。

Logo 与 `favicon.svg` 须保持同一几何；改一处必须同步另一处。

---

## 3. 默认模块 / 路由（忽略禁用模块）

### 3.1 启用模块列表

在产品仓的组装层裁剪示例模块：

- `apps/client/src/enabled-modules.ts`
- `apps/server/src/enabled-modules.ts`

未使用的 `notes` / `todos` 应从注册表移除（或确认租户 entitlement 默认关闭且导航带 `tenantModule`）。

### 3.2 登录落地页候选

候选列表在**组装层**，不在 `client-kit` 内部写死产品路径：

```ts
// apps/client/src/home-path-candidates.ts
export const HOME_PATH_CANDIDATES: readonly HomePathCandidate[] = [
  { path: "/estimate", tenantModule: "estimation", permission: "estimation.read" },
  { path: "/dashboard" }, // 工作台：无门控，永远命中，作为兜底
  // 仅当产品仍启用 notes 时保留
];
```

规则：

1. **顺序即优先级**——业务首页在前，无门控的 `/app/dashboard` 放最后当兜底
   （be-water 默认就是 `/app/dashboard` 单项：所有用户登录后落在工作台）
2. 每个**带门控**的候选必须带 `tenantModule`（= manifest `tenantEntitlements[].key`）
3. `resolveAppHomePath` 会跳过 `entitlements.modules[id] === false` 的候选
4. 全部不可用时回退 `DEFAULT_HOME_PATH`（`/app/settings`）
5. 缺 `tenantModule` 时**无法**按 entitlement 跳过——升级时这是常见回归

导航项同样要写 `tenantModule` / `tenantFeature`，侧栏与顶栏过滤逻辑才与落地页一致。

---

## 4. 升级自检

- [ ] 所有租户页已套 `PageLayout`；平台页未套
- [ ] 旧版 Logo / Wordmark / favicon / manifest / `index.html` 标题已保留
- [ ] `APP_DISPLAY_NAME` / `APP_TAGLINE` 已改；`STORAGE_PREFIX` 与旧版一致（若有存量用户）
- [ ] `HOME_PATH_CANDIDATES` 在 `apps/client/src/home-path-candidates.ts`，业务入口在前且带 `tenantModule`（无门控的 `/app/dashboard` 兜底放最后）
- [ ] 未启用的示例模块已从 `enabled-modules` 移除
- [ ] 用「关闭某业务模块 entitlement」的租户登录，确认不会落到该模块路由
