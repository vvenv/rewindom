# module-useless

由 `scripts/gen-module.mjs` 从 `MODULE.spec.yaml` 生成。改需求请改 spec 后重新生成，
或在此记录手工偏离之处。

## 用途

无用句子库——每天一条没有用的话

## 面划分

| 面     | 路由      | 目录      | 所需权限                                   |
| ------ | --------- | --------- | ------------------------------------------ |
| 租户侧 | `/app/things` | `client/` | `things.read`（写操作另需 `things.write`） |

## 权限控制

四处必须同时收窄，缺一处就会出现「看得见点不进」或「点得进但请求 403」：

| 位置         | 文件                                                           | 收窄方式                                   |
| ------------ | -------------------------------------------------------------- | ------------------------------------------ |
| 路由         | `server/thing.routes.ts`                                       | `app.requirePermission`                    |
| 导航项       | `client/tenant/nav-sections.ts`                                | `anyPermission: ["things.read"]`           |
| 页面路由     | `client/tenant/routes.tsx`                                     | `PermissionRoute permission="things.read"` |
| 页面内写操作 | `client/pages/things.tsx`、`client/components/ThingsTable.tsx` | `hasPermission("things.write")`            |

## 相对生成物的手工偏离

`gen-module.mjs` 的产出停在「能跑的单语版本」，下面几处是生成后补的。
**直接 `--force` 重新生成会把它们全部覆盖掉**，改需求请改 spec 后再把这几项手工补回。

| 偏离                       | 原因                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `server/i18n.ts`           | 生成器不产出；审计与报错按稳定 code 提供 zh-CN/en（见 `docs/design/i18n.md`）               |
| 审计用 `detail_key`        | 生成器仍写 `details: "创建无用：…"`，该字段已不在 `AuditLogEmitInput` 上——**tsc 会红**      |
| 错误用稳定 code            | 生成器写 `NotFoundError("无用不存在")`；改为 `useless.not_found` 等，路由统一 `sendCodedError` |
| `client/i18n.ts` + locales | 生成器不产出；组件原本把中文写死在 `toast` / 表头 / 空态里                                  |
| nav 用 `ns:key`            | 生成器写中文原文，会锁死为首屏语言；分组 key 借 `content:nav.section` 才能并进「内容」分组  |
| 路由 `/app` 前缀           | 生成器产出 `/things`，与 note / content 等实际约定的 `/app/<plural>` 不一致                 |
| 表单 `enabled` 初值        | 生成器给 `false`，与 Prisma 的 `@default(true)` 相反，新建即停用                            |

## 依赖

- `module-rbac`
- `module-audit`

## 如何单独测试

```bash
pnpm --filter @rewindom/useless test
```
