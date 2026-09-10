# 部署文档

## 概述

Rewindom 采用 **Docker Compose** 统一部署：

- **本地开发**：`docker-compose.dev.yml` 提供 PostgreSQL + Redis；应用在宿主机 `pnpm dev`
- **生产/测试**：`docker-compose.prod.yml` 在服务器构建运行完整栈；宿主机 Nginx 终结 SSL

## 环境要求

### 开发机

- Node.js 22+、pnpm 11+
- Docker（`pnpm db:up`）

### 服务器

- Ubuntu 22.04 LTS（推荐）
- Docker + Docker Compose v2
- Nginx + Certbot（首次 bootstrap 自动安装）

## 开发环境

### 日常开发（推荐）

Docker 只跑 **Postgres + Redis**，应用在宿主机热更新：

```bash
git clone <repository-url>
cd rewindom
pnpm install
pnpm setup          # 创建 .env.local、启动 DB、执行 migrate
pnpm dev            # 前端 :7300，API :3700
```

手动分步等价于 `pnpm setup`：

```bash
cp .env.example .env.local
pnpm db:up
pnpm --filter server exec prisma migrate deploy
pnpm dev
```

- 环境文件：`.env.local`（Prisma / 服务端优先读取，覆盖 `.env`）
- 数据库：`localhost:5433`（Docker 映射，避免与本机 Postgres 冲突）
- Redis：`localhost:6379`

### 生产镜像本地验证（可选）

发布前验证与线上一致的 Docker 栈：

```bash
cp scripts/env.docker.local.example .env.docker.local
pnpm docker:stack:up
# http://localhost:3700
pnpm docker:stack:down
```

与 `pnpm db:up` 使用不同 Compose 项目名，可同时存在；容器名也已区分（`rewindom-dev-*` vs `rewindom-*`）。

## 生产环境（Docker）

### 1. 配置环境变量

```bash
cp scripts/env.production.example .env.production
# 填写 DEPLOY_HOST、DB_PASSWORD、JWT_SECRET、APP_DOMAIN 等
```

### 2. 首次部署（bootstrap）

```bash
pnpm bootstrap -- --env production
```

流程：上传源码 → 远程 `docker compose build` → 启动栈 → 配置 Nginx + SSL → 健康检查。

### 3. 日常更新

```bash
pnpm deploy -- --env production
```

服务器执行 `docker compose build`。Dockerfile 已按 sibling **shipest** 做分层缓存（先 install 依赖清单、BuildKit pnpm store、prod prune）：**依赖未变时二次构建会快很多**。不要在服务器跑 `docker system prune -a` / `--volumes`（会拆掉层缓存和 PG/Redis 数据卷）。日常清理用 `scripts/docker-prune.sh`（只删悬空镜像、退出容器、失败构建缓存）；`pnpm deploy` 会安装每天 04:15 的 cron。

### 官网（租户 CMS SSR）

产品主域与其它绑定 Host 的 HTML 文档由 Nginx 反代到 Fastify Marketing SSR；
仅 `PLATFORM_HOST`（平台控制台）走静态 SPA（`app.html`）。
应用壳路径（`/app`、`/login`、`/platform` 等）始终走 SPA。

### 4. 仅同步环境变量

```bash
pnpm deploy -- --env production --env-only
```

### 5. 本地验证生产 Compose

见上文「生产镜像本地验证」：`pnpm docker:stack:up`（`.env.docker.local`）。

远程目录：`/opt/rewindom-docker`（production）、`/opt/rewindom-docker-test`（test）。

## 发布

默认：跳过本机 lint/test → 本地 Docker 构建部署到 production → 推送 commit + tag。

```bash
# 默认路径（本地部署 production + 推送）
pnpm release patch

# 部署到测试环境
pnpm release patch -- --env test

# 先跑本机 lint/test
pnpm release patch -- --check

# 推送 tag 触发 GitHub Actions（不本地部署）
pnpm release patch -- --ci --push
```

## 运维

### 宿主机 Nginx 的 HTTP/2

**443 那行 listen 不是本仓库渲染的**——`docker_render_host_nginx_proxy` 只写
`listen 80`，TLS 那个 server 块由 `certbot --nginx` 接管并补上 `listen 443 ssl;`。
certbot 从不开 HTTP/2，所以裸装出来的站点会一直停在 HTTP/1.1。

部署脚本每次都会跑一遍 `docker_enable_host_nginx_http2`（幂等）：给本仓库管的 vhost
（`# rewindom-` 开头那两种）的 443 listen 补上 `http2`，`nginx -t` 通过才 reload，
失败自动回滚。新签自定义域时 `acme-helper.py` 也会在 certbot 之后补一次。

自查：

```bash
curl -sI -o /dev/null -w "%{http_version}\n" https://<域名>/   # 期望 2
```

nginx ≥ 1.25.1 起 `http2 on;` 是新写法，listen 参数仍生效（`nginx -t` 会提示
deprecated）。生产当前是 1.24，listen 参数是那儿**唯一**的写法。

### 宿主机 Nginx 的 HSTS

同样补在 certbot 写的 443 块上：`docker_enable_host_nginx_hsts`（每次部署幂等）和
`acme-helper.py` 新签域名之后。应用层 SSR 在 https origin 上也会带
`Strict-Transport-Security: max-age=31536000; includeSubDomains`，两层重复无害。

自查：

```bash
curl -sI https://<域名>/ | grep -i strict-transport
```

### 日志

```bash
# 服务器上
cd /opt/rewindom-docker
docker compose -f docker-compose.prod.yml logs -f app
```

GitHub Actions → **Ops** workflow：`status` / `logs` / `health-check` / `restart` / `stop` / `sync-env`。

### Docker 磁盘清理

小盘 VPS 上失败/中断的 `compose build` 会留下悬空镜像和 BuildKit 缓存。脚本**不**删数据卷、不删仍被容器使用的镜像：

```bash
# 服务器上
bash /etc/rewindom/scripts/docker-prune.sh --dry-run
bash /etc/rewindom/scripts/docker-prune.sh

# 开发机装到远程（每天 04:15）
./scripts/docker-prune-cron.sh install --remote --env production
```

`pnpm deploy` / `pnpm bootstrap` 会同步脚本并确保 cron 已安装。日志：`/var/log/rewindom-docker-prune.log`。

### 内容安全策略（CSP）

分两套，因为两边的内容来源不同：

| 面 | 谁发这个头 | 模式 | script-src 怎么放行 |
| --- | --- | --- | --- |
| 应用壳层（`/app`、`/platform`、登录页…） | nginx（`csp-app.conf`） | **一直 enforce** | 构建时算 `index.html` 内联脚本的 sha256 |
| 公开面（官网 SSR、店面、文档、会员页） | 应用自己 | `SITE_CSP_MODE`，默认 `report` | 每响应一个 nonce + 按站点算出的统计脚本来源/hash |

**应用壳层**没有任何租户内容，可以直接严格：`apps/client` 的 postbuild
（`scripts/gen-csp.mjs`）读构建产物，把内联引导脚本的 hash 写进 `csp-app.conf`，
镜像构建时拷进 nginx。改了 `index.html` 重新构建策略自动跟上，不存在失配。

**公开面**上还有租户配的第三方统计脚本，来源因站而异。三类脚本三种放行方式：

- 页面自己的内联块（JSON-LD、明暗模式）→ 每响应 nonce
- 统计的内联片段（GA config / GTM / Clarity 加载器）→ 按**配置**算 hash
- 统计的外部脚本 → 按 origin 白名单

nonce 与 hash 的分工不是随意的：SSR 响应发 `public, max-age=60` 会被共享缓存收走，
nonce 每请求都变，缓存下来就是一份失效的策略；由配置决定的 hash 则与缓存天然一致。

#### 切 enforce 之前

```bash
# .env.production
SITE_CSP_MODE=report    # 默认：只把违规报到浏览器控制台，不拦任何东西
SITE_CSP_MODE=enforce   # 观察几天后再切
```

`report` 模式下打开站点的开发者工具，控制台会列出所有会被拦的资源。
重点看用了 **Google Tag Manager** 的站点：GTM 容器里可以再装任意第三方标签，
那些来源在配置里是不可知的，切 enforce 前必须逐个确认。

两边的 `style-src` 都保留了 `'unsafe-inline'`，这是有意识的取舍：壳层有五处、
公开面有两处在运行时插 `<style>`（清单见 `apps/client/scripts/gen-csp.mjs` 与
`packages/builtin/marketing/server/site-csp.ts` 的文件头注释）。CSP 防 XSS 的价值
绝大部分在 script-src；要收紧 style-src 得先把那些改成 CSSOM。

### 限流：从观察切到拦截

限流默认 `log_only`——每个**本该被拦**的请求只记日志不拒绝。默认是对的（阈值定错
把真实用户挡在门外，比它要防的滥用严重），但只有真去读日志才有意义：

```bash
# 服务器上，看最近 7 天谁会被拦
./scripts/ip-access-report.py --since 168h
./scripts/ip-access-report.py --env test --since 24h
```

报告会给出：会被影响的独立 IP 数、命中最多的路径、按档位分布。判断标准：

- 集中在少数 IP + 路径集中在 `/api/auth/*` → 是爆破，可以切 `enforce`
- 分散在很多 IP、路径也杂 → 先确认里面没有自己的办公出口或监控

切换前把办公出口和监控地址放进 `IP_ACCESS_ALWAYS_ALLOW`（压过一切封禁），
然后 `IP_ACCESS_RATE_LIMIT_MODE=enforce` + `pnpm deploy` 或 Ops → sync-env。

### 回滚

部署是「在服务器上从源码 build」，没有镜像仓库，所以回滚不能靠 `docker pull`。
每次部署会先把当前跑着的镜像另打一个 `:rollback` 标签，出事时把它换回来即可：

```bash
# 服务器上
cd /opt/rewindom-docker          # 测试环境是 /opt/rewindom-docker-test
for s in app web; do
  img="$(docker inspect -f '{{.Config.Image}}' "rewindom-$s" 2>/dev/null)"
  docker tag "${img%:*}:rollback" "$img"
done
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-build
```

只回滚**代码**。这一步不会撤销已经执行的数据库迁移——迁移要往回走得单独处理
（写一条反向 migration，或从备份还原）。所以破坏性迁移（删列、改类型）应当拆成
两次发布：先兼容读写，确认稳定后再删。

### 备份

```bash
# 安装每日定时备份（每天 08:00，含 30 天保留策略）
./scripts/backup-cron.sh install --env production

# 手动跑一次
bash /etc/rewindom/scripts/backup.sh --env production
```

备份**三样**东西，缺一不可：

| 产物 | 文件名 | 说明 |
| --- | --- | --- |
| PostgreSQL | `app_backup_<ts>.dump` | `pg_dump` custom 格式 |
| 应用数据卷 | `app_data_<ts>.tar.gz` | `/data`：附件与导出件 |
| Redis | `app_redis_backup_<ts>.rdb.gz` | RDB 快照 |

只备数据库是不够的：`ATTACHMENT_STORAGE=local` 时用户上传的文件只存在于 `/data`
这一个卷里，库还原得再完整，附件丢了就是丢了。

脚本会自己探测拓扑（`scripts/lib/stack.sh`）：数据库跑在容器里就走 `docker exec`，
跑在宿主机上就走 `sudo -u postgres`。库名从容器的 `POSTGRES_DB` 读，不按环境硬猜。

#### 异地副本（务必配）

备份默认与数据库躺在同一台机器上——机器没了备份一起没。设置 `BACKUP_OFFSITE_DEST`
后每次备份都会把产物推走：

```bash
# S3 兼容（需要 aws cli）
BACKUP_OFFSITE_DEST=s3://my-bucket/rewindom/production

# 或 rclone 远端（R2 / B2 / 任意后端）
BACKUP_OFFSITE_DEST=r2:rewindom-backups/production
```

配了却推不上去会**直接失败退出**。静默成功的异地备份等于没有异地备份。

### 还原

```bash
./scripts/restore.sh --env production --list                  # 看有哪些备份
./scripts/restore.sh --env production --latest                # 还原最新的库
./scripts/restore.sh --env production --data-file <app_data_*.tar.gz>   # 还原附件
./scripts/restore.sh --env production --only-data --latest    # 只还原 /data
```

还原 PG 前会自动做一次安全备份（`app_backup_safety_*.dump`）作为回滚兜底。
还原 `/data` 会先停 app 容器再清空重解包，结束后按原状态拉起。

> **定期演练。** 没被还原验证过的备份只是一堆文件。建议每季度在测试环境跑一次
> `--latest` 全量还原，确认表数量、关键表行数与附件都对得上。

### 远程备份/还原（开发机）

```bash
./scripts/db-remote.sh pull --env production --fresh
./scripts/db-remote.sh push --env production --file ./backups/production/app_backup_xxx.dump --yes
```

### 本地还原

```bash
./scripts/restore-local.sh --latest
```

## 健康检查与告警

```bash
# 进程存活（Docker healthcheck 用这个；不打数据库）
curl http://127.0.0.1:3700/health

# 依赖就绪（仅 Postgres 为硬依赖；失败 503，body 只有 `{ status }`）
curl -i http://127.0.0.1:3700/ready

# 整机体检（服务器上）
bash /etc/rewindom/scripts/healthcheck.sh --env production
```

`healthcheck.sh` 查四件事，每一件都对应一种「平时毫无感觉、出事那天才知道」的故障：

| 检查 | 失败意味着 |
| --- | --- |
| `/ready` | 应用没在接流量 |
| 四个容器在跑且 app 为 healthy | 有东西挂了或起不来 |
| 磁盘 < 85% | 应用与数据库同盘，写满先挂的是 Postgres |
| 最新备份 < 36 小时 | **备份静默停掉了** |

最后一条是它存在的主要理由：备份坏掉不会有任何征兆，cron 每天照跑、日志里只有一行失败。

### 定时告警（不引入监控厂商）

`Monitor` 工作流每小时跑一次上面这个脚本，失败即工作流变红，GitHub 按仓库通知设置
发邮件。这就是目前的告警链路——没有 APM，但「服务挂了 / 备份停了」这两类不会再无人知晓。

要更强的可观测性（错误率、延迟分位、依赖追踪）得另接 APM，那是选型问题，不在本仓库范围内。

脚本由 `pnpm deploy` 自动同步到 `/etc/rewindom/scripts/`（与 backup.sh、restore.sh 一起）。

## GitHub Actions Secrets

按 environment（production / test）配置：

| Secret | 说明 |
| --- | --- |
| `DEPLOY_HOST` / `DEPLOY_SSH_USER` | 目标主机与登录用户 |
| `DEPLOY_SSH_KEY` | **推荐**。私钥内容；配了它就不需要 `DEPLOY_SSH_PASSWORD` |
| `DEPLOY_SSH_PASSWORD` | 密码登录。仅在没有 `DEPLOY_SSH_KEY` 时才需要 |
| `DB_PASSWORD` / `JWT_SECRET` / `TENANT_SECRET_ENCRYPTION_KEY` | 部署必需 |

部署脚本本来就是「先试密钥、失败再用密码」，所以 `DEPLOY_SSH_KEY` 只需存在于
Secrets，工作流会把它装进 runner 的 `~/.ssh` 并固定主机指纹。两个都配时密钥优先；
只配密码时行为与从前完全一致。

## 环境变量

| 变量                           | 说明                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `DEPLOY_HOST`                  | SSH 主机（本机专用）                                                                                             |
| `BACKUP_OFFSITE_DEST`          | 备份异地目标（`s3://...` 或 rclone 远端）；不设则备份只存在本机                                                  |
| `CONTAINER_PREFIX`             | 容器名前缀，部署脚本按环境写入（production=`rewindom`，test=`rewindom-test`）                                    |
| `APP_DOMAIN`                   | 产品主域（默认租户 CMS）                                                                                         |
| `PLATFORM_URL`                 | 平台控制台 origin（默认 `https://admin.${APP_DOMAIN}`）                                                          |
| `PLATFORM_HOST`                | Nginx 上平台控制台 hostname（默认 `admin.${APP_DOMAIN}`）                                                        |
| `APP_PORT`                     | Docker web 映射到 127.0.0.1 的端口（默认 3700）                                                                  |
| `DB_PASSWORD`                  | PostgreSQL 密码                                                                                                  |
| `JWT_SECRET`                   | JWT 签名密钥                                                                                                     |
| `TENANT_SECRET_ENCRYPTION_KEY` | 租户密钥加密（32 字节 hex）                                                                                      |
| `SINGLE_TENANT`                | `true` 时单租户部署（默认关闭）；须同时出现在 `.env.production` 与 `docker-compose.prod.yml` → `app.environment` |
| `TENANT_BASE_DOMAIN`           | 平台通配子域基域（如 `rewindom.com`）；`{slug}.{base}` 自动锁定租户；空则关闭                                    |
| `TRUSTED_PROXIES`              | 可信反向代理，决定 `request.ip` 取 XFF 哪一跳；compose 默认 `uniquelocal`；**生产不可留空** |
| `IP_ACCESS_ENABLED`            | IP 访问控制判定开关（默认开）                                                                    |
| `IP_ACCESS_ALWAYS_ALLOW`       | 压过一切封禁规则的豁免 CIDR 列表；留空 = 一条过宽的规则能把你自己锁在外面                        |
| `IP_ACCESS_NGINX_EXPORT_PATH`  | nginx 封禁片段导出路径（容器内），空则判定全留在应用层                                           |
| `STRIPE_SECRET_KEY`            | 商店收款平台默认 Stripe Secret（站点设置可覆盖）                                                                 |
| `STRIPE_WEBHOOK_SECRET`        | 商店收款平台默认 Stripe Webhook Secret                                                                           |
| `STRIPE_PUBLISHABLE_KEY`       | 商店收款平台默认 Stripe Publishable Key                                                                          |
| `ATTACHMENT_STORAGE`           | 文件存储后端：`local`（默认）/ `s3` / `r2`（Cloudflare R2）                                                      |
| `S3_ENDPOINT`                  | S3 兼容 endpoint；R2 为 `https://<account_id>.r2.cloudflarestorage.com`                                          |
| `S3_REGION`                    | 默认 `auto`（R2 要求）                                                                                           |
| `S3_BUCKET`                    | 对象存储 bucket                                                                                                  |
| `S3_ACCESS_KEY_ID`             | 对象存储 Access Key                                                                                              |
| `S3_SECRET_ACCESS_KEY`         | 对象存储 Secret                                                                                                  |
| `S3_PUBLIC_BASE_URL`           | 公开读 CDN / r2.dev / 自定义域；空则由应用转发字节                                                               |

完整列表见 `scripts/env.production.example`。新增应用运行时变量时，务必同步写入 `docker-compose.prod.yml` 的 `app.environment` 白名单（`docker-compose.dev.yml` 不需要）。

门禁：`pnpm check:prod-app-env`（从 `config.ts` 对照 compose + example；已挂 Architecture CI）。

### 可信代理与 client IP

`request.ip` 的取值由 Fastify `trustProxy` 决定，而它读的是 `TRUSTED_PROXIES`
（`config.server.trustedProxies`）。取值三选一：CIDR / IP 列表（逗号分隔）、proxy-addr
预置名 `loopback` / `linklocal` / `uniquelocal`、或纯数字表示信任最靠近本进程的 N 跳。

**不接受 `true` / `*`，配置成那样会直接启动失败。** 无条件信任 `X-Forwarded-For`
等于把 client IP 的决定权交给客户端：任何人加一行请求头就能伪造自己的 IP，绕过按 IP
的限流，也能填别人的 IP 去触发自动封禁——把防护系统当成打无辜用户的放大器。审计日志
`ip_address` 的可信度同样归零。

**优先写网段，不要用跳数。** 跳数模式只数跳数、不校验对端是谁：只要有人能绕过反代
直连应用端口，他自带的 XFF 就会被采信（实测 `trustProxy: 1` 配伪造 XFF 即可改写
client IP）。只有在应用绝对不可直连时才考虑跳数。

默认 `uniquelocal` 对应标准拓扑「宿主 nginx → 容器 nginx → app」，三跳都在私网。
**外层若换成公网出口的云 LB / CDN 回源，必须改成该 LB 的实际网段**，否则最外一跳
不被信任，`request.ip` 会退回成 LB 的地址，全站 IP 归一。

代码里一律用 `getClientIp(request)`（`@rewindom/server-kernel/lib/client-ip.js`，
模块侧从 `@rewindom/module-sdk/server` 取），不要直接读 `request.ip`——它还负责把
IPv4-mapped IPv6（`::ffff:1.2.3.4`）与裸 IPv4 收敛成同一个字符串。拿不到可信地址时
返回 `null`，调用方要显式处理，不要回退成占位串。

### IP 封禁（module-ip-access）

两级名单：平台全局（`/platform/ip-rules`）与站点级（`/app/ip-access`）。完整口径见
[`packages/builtin/ip-access/MODULE.md`](../packages/builtin/ip-access/MODULE.md)，
部署上要注意三件事：

**1. `IP_ACCESS_ALWAYS_ALLOW` 不要留空。** 它是压过一切数据库规则的豁免名单，
装的是「被误封就没人能修」的地址：监控探针、健康检查来源、CDN 回源段、支付回调源、
自己的办公出口。留空意味着一条过宽的规则能把运维自己锁在后台外面，而那时你已经改不了规则。

**2. 边缘层名单要等 nginx reload 才生效。** app 容器把平台级 enforce block 规则渲染成
`geo` 片段写进 `rewindom_ip_access` 卷，web 容器 `include` 它。**app 无法 reload 另一个
容器的 nginx**，所以边缘层名单实际是在下一次部署 / reload 时对齐的。这不影响封禁本身——
应用层判定是实时的，边缘层只是额外拦住那些不经过 Node 的流量（静态资源、高频扫描）。
要立刻生效就 `docker compose exec web nginx -s reload`。

**3. 首次部署不会因为缺文件而 502。** web 镜像的 `/docker-entrypoint.d/20-ip-access-stub.sh`
会在片段缺失时写一个「谁都不封」的占位，app 起来后覆盖。

### 租户自定义域名（可选）

应用层绑定：平台控制台为租户填写唯一 hostname；客户配 DNS；平台管理员点「签发证书」（宿主机 ACME helper + Let's Encrypt）。同一实例可服务多域名。

需要 `ACME_HELPER_TOKEN`（及可选 `ACME_HELPER_URL`，compose 默认 `http://host.docker.internal:9370`）。`pnpm deploy` 会安装 helper：听 `0.0.0.0:9370` 供容器经 `host.docker.internal` 访问，并用 iptables 把该端口限制在回环 + RFC1918。

**完整步骤、客户说明模板与验收清单**：见 [`custom-domain.md`](./custom-domain.md)。设计口径：[`design/tenant-config.md`](./design/tenant-config.md) §5.9。

更多问题见 `faq.md`。
