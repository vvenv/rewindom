# module-ip-access

## 用途

按 IP / IP 段拒绝访问。两级名单：**平台全局**（`tenant_id = null`，作用于所有 Host）与
**站点级**（作用于该租户的 Host）。判定在应用层，名单同时导出给 nginx 在边缘层执行。

## 依赖

- kernel（`getClientIp`、`resolveHostTenant`、`registerEarlyMiddleware`）
- `module-rbac`、`module-audit`、`module-background-job`

## 怎么发现该封谁

封禁回答的是「怎么拦」，但难的一步在前面：**你怎么知道该拦谁**。三个入口，
按响应速度排：

| 入口 | 覆盖面 | 留存 |
| --- | --- | --- |
| 平台页运行状态卡里的「访问来源」（默认收起，摘要可见） | 最近 1 小时请求量 Top N，含错误率，**可一键建规则** | Redis 滚动，重启归零 |
| 平台页慢请求日志（按 IP 筛） | 超阈值的请求，含来源 IP 与路径 | 按 `SLOW_REQUEST_RETENTION_DAYS` |
| 宿主 nginx access log | **全量请求**，唯一的全景 | 按日志轮转策略 |

租户在 `/app/ip-access` 看到的是**同一份来源列表，但只含打到自己站点的流量**——
作用域强制取自 `tenantContext`，前端传什么都无效。列表默认收起，避免挡住规则表；
站点页没有平台那张运行状态卡，来源自己占一张 `SettingsPanel`。

平台首页（`/platform`）另有一块告警区：代理链配错、判定被关、自动封禁待复核。
一切正常时它自己隐藏——首页的注意力是稀缺资源，常驻一块「一切正常」会让真正的
告警更容易被略过。

```bash
# 谁在打我 —— Top 20 来源
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
# 只看 4xx/5xx（扫描器的典型特征）
tail -10000 /var/log/nginx/access.log | awk '$9 ~ /^[45]/ {print $1}' | sort | uniq -c | sort -rn | head
```

「访问来源」用 Redis 滚动计数而不落库：高峰期每秒几千次写入，为一个「看一眼谁在
打我」的视图不值得。它是**易失**的，这是刻意取舍——这份数据的用途是「此刻发生了
什么」，不是审计；长期留存看 nginx 日志。桶自带 TTL 且定期裁剪到 Top N，
否则一次 /16 扫描就能把 Redis 内存吃掉。

## 限流

**封禁只对少数固定 IP 有效，限流才是扛量的那一半。** 真实滥用通常是很多 IP 各来
一点（代理池、僵尸网络、被刷的公开接口）；等你把 IP 枚举进名单对方早换完了。
限流不关心对方是谁，只关心「这个来源要得太多了」，天生对付 IP 轮换。

按**代价**分三档，因为一个全局阈值必然是错的——翻页浏览和暴力破解登录的合理速率
差两个数量级：

| 档 | 匹配 | 默认 |
| --- | --- | --- |
| `auth` | `/api/auth/*`、会员登录注册、OAuth 回调 | 20/min |
| `public` | `/api/public/*` 的**写**请求（读不限：那是官网正常浏览） | 30/min |
| `default` | 其余 | 600/min |

`default` 刻意宽：一个共享出口（公司 NAT、咖啡馆）后面可能有几十个真实用户，
定严了先挡住的是他们。

顺序是**豁免 → 封禁 → 限流**。豁免名单连限流一起豁免——监控探针的轮询频率本来
就高，限掉它等于自己把健康检查掐了。被封的 IP 得到 403 而不是 429：两者语义不同，
客户端按它决定要不要重试。

默认 `log_only`。阈值定错的代价是把真实用户挡在门外，比它要防的滥用严重得多。

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
| `/health`、`/ready`、CORS 预检 | 永不判定（健康检查被拦会引发滚动重启） |

判定挂在认证之前：被封的 IP 不该先跑一遍 JWT 验签、租户查库、权限计算再被拒。
为此给 `ServerAppModule` 加了 `registerEarlyMiddleware` 扩展点，组装层在
`authMiddleware` 之前调用。

## 代理链错配：本模块最大的失效模式

自定义域名的流程是「客户配 DNS」。**任何一个租户都能把自己的域名挂到他自己的
Cloudflare 账号下、开橙云、回源指向本站——不通知平台，平台也拦不住。**

那一刻起，该域名上所有请求到达 origin 时 socket 对端都是 CF 边缘节点。若
`TRUSTED_PROXIES` 不含 CF 段，`request.ip` 就停在那一跳：

- 该域名上十个人各输错一次密码 → 计数全落在同一个边缘 IP 上 → 触发自动封禁
- 规则写进**平台全局**名单，而那个边缘 IP 服务着 Cloudflare 的一大片流量

一次配置疏忽就能把封禁系统变成打击无辜用户的放大器。

三道防线：

1. **`CLOUDFLARE_PROXY=true`** 把 CF 官方网段并入可信代理。CF 自己会把访客 IP
   追加进 XFF，所以信任这些段之后标准 XFF 解析就是对的，**不需要读
   `CF-Connecting-IP`**（少一个可伪造的头）。
2. **护栏**（`proxy-guard.ts`）：解析出的 client IP 若落在已知代理 / CDN 段内，
   拒绝自动封禁。它不依赖名单是否最新——CF 会增删网段、租户会换 CDN、
   云 LB 会换出口，护栏只问「这看起来像基础设施吗」。手工建 `block` 规则打到
   这些段上同样会被拒（`ip_access.proxy_range`）；`allow` 不拦，把回源段加进
   豁免名单是正当用法。
3. **平台红告警只在「CDN 已声明访客 IP，解析却仍停在边缘段」时拉响**
   （请求带着与 `request.ip` 不同的 `CF-Connecting-IP` / `True-Client-IP`）。
   对端自己就在 CF 网段（Workers 出站、扫 WordPress 的机器人、WARP）也会让
   client IP 落在 `172.64.0.0/13`，那不是少信了一跳——误开 `CLOUDFLARE_PROXY`
   会让这些来源能借可信跳伪造 XFF。判定路径对真错配只告警一次。

内置的 CF 网段是**快照**（见 `lib/proxy-ranges.ts`），会过期。补充段写
`IP_ACCESS_PROXY_RANGES`，并定期核对 `https://www.cloudflare.com/ips-v4`。

`trustProxy` 是 Fastify 全局设置，做不到「A 域名信 CF、主域不信」——
`CLOUDFLARE_PROXY` 是**部署级**开关，不是租户级。

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
| `CLOUDFLARE_PROXY` | `false` | 站点在 CF 橙云后面时设 true，把 CF 网段并入可信代理 |
| `IP_ACCESS_PROXY_RANGES` | 空 | CF 之外的代理 / CDN 出口段；这些地址永不自动封禁 |
| `IP_ACCESS_TRAFFIC_STATS` | `true` | 「访问来源」观测面 |
| `IP_ACCESS_TRAFFIC_BUCKET_SECONDS` | `300` | 统计分桶时长 |
| `IP_ACCESS_TRAFFIC_BUCKETS` | `12` | 窗口 = 桶长 × 桶数（默认 1 小时） |
| `IP_ACCESS_TRAFFIC_MAX_TRACKED` | `2000` | 每桶最多跟踪多少来源 |
| `IP_ACCESS_RATE_LIMIT_ENABLED` | `true` | 按 IP 限流 |
| `IP_ACCESS_RATE_LIMIT_MODE` | `log_only` | 切 `enforce` 才真正回 429 |
| `IP_ACCESS_RATE_LIMIT_AUTH_PER_MINUTE` | `20` | 登录 / 注册 / 改密，0 = 不限 |
| `IP_ACCESS_RATE_LIMIT_PUBLIC_PER_MINUTE` | `30` | 公开写接口 |
| `IP_ACCESS_RATE_LIMIT_DEFAULT_PER_MINUTE` | `600` | 其余请求 |

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

**命中计数是批量写的。** 直接每请求写库有个要命的性质：命中越频繁写得越多——
一个被封的 IP 以 1000 rps 打进来就是每秒 1000 次数据库写，攻击越猛你自己压垮
数据库越快。改成内存攒 5 秒批量落库，停机前 flush。统计滞后几秒无所谓，
`hit_count` 是给人看「这条规则拦到东西没有」的，不是账。

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

**按国家 / ASN 封禁。** 刻意不做，两个理由。其一，区域级异常如果真是 abuse，
几乎必然是**很多 IP 各来一点**（代理池 / 僵尸网络）——等你枚举完对方早换了，
正确的工具是限流而不是封禁，给运维造一把不该用的锤子会诱导错误处置。其二，
它要往底座塞一个 70MB 的授权 GeoIP 库。真需要按区域拦，那属于边缘层：
nginx 的 geoip2 模块或 CDN 的规则。

**把名单推到 Cloudflare 边缘。** `nginx-export.ts` 已经把「名单 → 执行层」抽成了
独立环节，加一个 `cloudflare-sync.ts`（IP Lists + 自定义规则）走同样的触发时机即可，
判定层不用改。没做是因为它给底座引入外部 SaaS 依赖（token 存储、失败重试、
租户能不能各自绑自己的账号），是产品决策而非技术细节。


**人机验证（challenge）。** 真正的挑战流程要一个过闸页加一份「这个访客已通过」的会话
状态，横跨 SSR / SPA / API 三条路径，是独立的一块工作。放一个静默等同于 block 的第三态
进来只会骗人，所以 `IpRuleAction` 目前只有 `allow` / `block`。

## 如何单独测试

```bash
pnpm --filter @rewindom/builtin exec vitest --run --project 'ip-access/*'
```
