# module-ip-access

## 用途

按 IP / IP 段拒绝访问。两级名单：**平台全局**（`tenant_id = null`，作用于所有 Host）与
**站点级**（作用于该租户的 Host）。判定在应用层，名单同时导出给 nginx 在边缘层执行。

## 依赖

- kernel（`getClientIp`、`resolveHostTenant`、`registerEarlyMiddleware`）
- `module-rbac`、`module-audit`、`module-background-job`

## 判定优先级

从高到低，`decideIpAccess` 把它固定在 `server/ip-access.decision.ts`：

1. 配置豁免名单（`IP_ACCESS_ALWAYS_ALLOW`）
2. 平台 allow
3. 平台 block
4. 站点 allow
5. 站点 block
6. 默认放行

两处刻意的不对称：

- **配置豁免压过一切**，包括库里的 `0.0.0.0/0`。它装的是「被误封就没人能修」的地址——
  监控、健康检查、支付回调、办公出口。这是运维最后一根救命绳，所以放在数据库之外。
- **站点 allow 压不过平台 block**。否则任何一个站点都能给自己加一条 allow 豁免平台级封禁，
  平台就失去了最后的处置手段。

## 生效范围

| 流量 | 谁拦 |
| --- | --- |
| `/api/*` | 应用层（`registerEarlyMiddleware`，在认证之前） |
| 官网 SSR（`/`、`/shop/*` 等） | 同上——SSR 走同一个 Fastify 进程 |
| 静态资源（`/assets/*`） | **只能靠 nginx**，它们不经过 Node |
| `/health`、CORS 预检 | 永不判定（健康检查被拦会引发滚动重启） |

判定挂在认证之前：被封的 IP 不该先跑一遍 JWT 验签、租户查库、权限计算再被拒。
为此给 `ServerAppModule` 加了 `registerEarlyMiddleware` 扩展点，组装层在
`authMiddleware` 之前调用。

## 前置条件：可信代理

`request.ip` 的取值由 `TRUSTED_PROXIES` 决定（见 `docs/deployment.md`）。**配错了这里，
本模块整个是纸糊的**——无条件信任 `X-Forwarded-For` 意味着任何人加一行请求头就能
伪造自己的 IP 绕过封禁，还能填别人的 IP 去触发自动封禁。代码里一律用 `getClientIp()`。

## 扩展点

- `registerEarlyMiddleware` — 判定钩子
- 租户路由 `/api/ip-rules`（entitlement `ip-access` + `ip_access.read/write`）
- 平台路由 `/api/platform/ip-rules`（`requirePlatformAdmin`）
- `registerJobs` — 过期规则清理 + 边缘名单定时对齐
- 订阅 `auth.login_failed` / `auth.login_succeeded` 做登录爆破自动封禁
- 导出 `reportAbuse()`：任意模块可上报「这个 IP 干了坏事」

## 配置

| env | 默认 | 说明 |
| --- | --- | --- |
| `IP_ACCESS_ENABLED` | `true` | 关掉判定（名单还在，只是不拦） |
| `IP_ACCESS_ALWAYS_ALLOW` | 空 | 压过一切规则的豁免 CIDR 列表，逗号分隔 |
| `IP_ACCESS_REFRESH_INTERVAL_MS` | `15000` | 名单快照 TTL（Redis 广播是快路径，这是兜底） |
| `IP_ACCESS_AUTO_BAN_MINUTES` | `60` | 自动封禁的 TTL |
| `IP_ACCESS_LOGIN_FAILURE_THRESHOLD` | `10` | 触发自动封禁的失败次数 |
| `IP_ACCESS_LOGIN_FAILURE_WINDOW_MINUTES` | `15` | 失败计数窗口 |
| `IP_ACCESS_NGINX_EXPORT_PATH` | 见 compose | nginx geo 片段导出路径；空则不导出 |

## 几条不显然的设计

**新规则默认 `log_only`。** 这类名单第一版几乎总是比预想的宽。先跑几天看命中日志
（`[ip-access] log_only 命中`），确认伤不到人再切 `enforce`。

**IPv6 最小封禁粒度是 `/64`。** 家宽用户整段拿到一个 `/64`，换地址零成本，封 `/128`
约等于没封。自动封禁强制放大到 `/64`；手工规则允许更细，但表单会提示这基本无效。

**自锁保护。** 创建 / 更新一条会命中自己当前 IP 的 `enforce` + `block` 规则会被拒
（`ip_access.self_lockout`）。这类系统最经典的事故就是管理员回车之后自己也进不来了，
而改规则的入口恰好在被封的那一侧。

**fail-open。** 名单加载失败沿用上一份快照，从没加载成功过就当空名单放行。
一次数据库抖动让全站 403，比它要防的攻击严重得多。

**过期不依赖清理 job。** 快照本身按 `expires_at > now` 过滤，job 只负责删行。

**边缘层名单要等 nginx reload 才对齐。** app 容器写文件，web 容器 `include` 它，
但 app 没法 reload 另一个容器的 nginx。这不影响封禁本身——应用层判定是实时的，
边缘层只是额外拦住不经过 Node 的流量。要立刻生效：`docker compose exec web nginx -s reload`。

**边缘导出只含平台 + enforce + block。** 站点级规则要先知道 Host 属于谁，nginx 没有那个
上下文；`log_only` 的意义就是不拦；`allow` 不导出，避免两边规则集各自演化后打架。
用 `geo`（基数树）而不是堆 `deny`（线性表）。

## 数据模型

`IpAccessRule`。`tenant_id` 可空——null 表示平台全局，所以 tenant-guard 的 policy 是
`service_enforced` 而非 `tenant_id`：盲注租户谓词会让全局规则在租户上下文里整片消失。
作用域由 `ip-access.service.ts` 的 `scopeWhere` 显式给出。

`@@unique([tenant_id, cidr])` 在 Postgres 下管不住全局规则（NULL 互不相等），
`createIpRule` 因此额外查一次重复。

## 尚未实现

**人机验证（challenge）。** 真正的挑战流程要一个过闸页加一份「这个访客已通过」的会话
状态，横跨 SSR / SPA / API 三条路径，是独立的一块工作。放一个静默等同于 block 的第三态
进来只会骗人，所以 `IpRuleAction` 目前只有 `allow` / `block`。

## 如何单独测试

```bash
pnpm --filter @rewindom/builtin exec vitest --run --project 'ip-access/*'
```
