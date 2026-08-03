# 租户自定义域名绑定指南

单实例部署下，租户可通过两类域名访问并锁定身份：

1. **平台通配子域**（推荐默认）：`{slug}.{TENANT_BASE_DOMAIN}`，例如 `acme.water.moms.plus`——创建租户即有，**无需客户配 DNS**
2. **客户自定义域名**：如 `portal.acme.com`——客户配 DNS，平台控制台绑定

两类域名上效果相同：开放营销前台与租户中台，禁止平台控制台；登录/注册无需再写 `@租户标识`。若租户在「品牌」设置上传了 Logo / Favicon，Host 绑定登录页与浏览器标签会展示该租户品牌（见 `design/tenant-config.md` §2.4）。

绑定域上的营销前台默认是**租户 CMS**（`/app/site` 自助编辑），不是平台 be-water 静态官网；未发布站点时 SSR 返回「未开通」页。平台主域仍是构建期预渲染的产品官网。

> 设计口径见 [`design/tenant-config.md`](./design/tenant-config.md) §5.9；CMS 细节见 [`packages/modules/marketing/MODULE.md`](../packages/modules/marketing/MODULE.md)。

---

## 0. 平台通配子域（`*.water.moms.plus`）

### 0.1 配置

| 项 | 值 |
| --- | --- |
| env | `TENANT_BASE_DOMAIN=water.moms.plus`（须透传 compose；见 `tenancy-mode` / `check:prod-app-env`） |
| DNS（一次） | `*.water.moms.plus` → 平台入口（A/CNAME） |
| TLS（一次） | 证书 SAN 含 `water.moms.plus` + `*.water.moms.plus`（Let's Encrypt **DNS-01**） |
| Nginx | `server_name water.moms.plus *.water.moms.plus;`，透传 `Host` |

应用解析优先级：

1. Host = 平台主域名（`FRONTEND_URL` / `APP_DOMAIN`）→ 多租户 / 平台模式  
2. Host = `Tenant.custom_domain` → 锁定该租户  
3. Host = `{slug}.{TENANT_BASE_DOMAIN}` → 按 slug 锁定 active 租户  
4. 其它 → 不绑定  

保留前缀（不映射租户）：`www` / `app` / `api` / `platform` / `admin` / `mail` / `status` / `cdn` / `static` / `assets`。

### 0.2 通配证书签发与续期（DNSPod API）

HTTP-01 **无法**签发通配证书。DNS 在 DNSPod / 腾讯云时，生产机用独立 venv 的 Certbot + `certbot-dns-dnspod-109`（腾讯云 API 3.0），避免污染 apt 的 `python3-certbot`。

**一次性安装（生产机）：**

```bash
python3 -m venv /opt/certbot-dns
/opt/certbot-dns/bin/pip install -U pip
/opt/certbot-dns/bin/pip install certbot certbot-nginx certbot-dns-dnspod-109
ln -sfn /opt/certbot-dns/bin/certbot /usr/local/bin/certbot-dns

mkdir -p /root/.secrets/certbot
cat >/root/.secrets/certbot/dnspod-109.ini <<'EOF'
dns_dnspod_109_secret_id = <TENCENT_SECRET_ID>
dns_dnspod_109_secret_key = <TENCENT_SECRET_KEY>
EOF
chmod 600 /root/.secrets/certbot/dnspod-109.ini
```

**签发（或改用插件重签）：**

```bash
/opt/certbot-dns/bin/certbot certonly \
  --authenticator dns-dnspod-109 \
  --dns-dnspod-109-credentials /root/.secrets/certbot/dnspod-109.ini \
  --dns-dnspod-109-propagation-seconds 60 \
  -d water.moms.plus -d '*.water.moms.plus' \
  --cert-name water.moms.plus \
  --agree-tos -m <SSL_EMAIL> --non-interactive
```

**续期配置：**

- `/etc/letsencrypt/renewal/water.moms.plus.conf`：`authenticator = dns-dnspod-109`，并指向上述 credentials；`pref_challs = dns-01`
- systemd drop-in `/etc/systemd/system/certbot.service.d/override.conf`：

```ini
[Service]
ExecStart=
ExecStart=/opt/certbot-dns/bin/certbot -q renew --no-random-sleep-on-renew
```

然后 `systemctl daemon-reload`。`certbot.timer` 仍驱动定时续期；apex 等非通配证书若仍用 apt certbot 的 nginx/http-01，同一 `renew` 会读各自 renewal conf，通配这条走 DNS 插件即可。

**验收：**

```bash
/opt/certbot-dns/bin/certbot renew --cert-name water.moms.plus --dry-run
```

成功应看到 `Congratulations, all simulated renewals succeeded`。勿把 Secret 写进仓库或 compose；凭证仅放服务器 `600` 文件。

备用：无 API 时仍可用手动 TXT / `/root/bin/le-dns-*.sh` hooks，但无法无人值守续期。

### 0.3 产品侧

- 平台租户卡片展示「默认访问」：`https://{slug}.{TENANT_BASE_DOMAIN}`
- **不必**把该地址写入 `custom_domain`；改 slug 则子域跟随变化
- 客户若还要品牌域，再走下方「自定义域名」流程

---

## 1. 角色与分工（客户自定义域名）

| 角色 | 负责事项 |
| --- | --- |
| **租户 / 客户** | DNS（自定义域）；在中台 `/app/site` 编辑并发布官网内容 |
| **平台管理员** | 控制台绑定 `custom_domain`；开通 entitlement `tenant-marketing`（默认开） |
| **实例运维** | 公网入口、TLS；Nginx 按 Host 分流（平台静态 / 租户 SSR） |

通配子域只需运维完成 §0；自定义域还需客户 DNS + 控制台绑定。官网文案由租户在 CMS 发布后生效。

---

## 2. 成功后的效果

假设平台主域名为 `https://app.example.com`，租户绑定了 `portal.acme.com`：

| 访问方式 | 行为 |
| --- | --- |
| `https://portal.acme.com/` | 租户已发布官网（SSR 完整正文）；未发布则提示未开通 |
| `https://portal.acme.com/login` | 登录锁定该租户；可用裸用户名（如 `admin`） |
| `https://portal.acme.com/app/site` | 租户自助编辑官网（需 `site.read`） |
| `https://portal.acme.com/app` | 租户中台 |
| `https://portal.acme.com/platform` | **不可用**（前端跳转；API 403） |
| `https://app.example.com` | 不变：平台产品官网（静态预渲染）、多租户登录、平台控制台 |

同一域名全局只能绑一个租户；不可绑定平台主域名（`APP_DOMAIN` / `FRONTEND_URL` 对应主机名）或 `localhost`。

---

## 3. 客户侧：DNS 设置（必做）

### 3.1 准备信息

向平台方确认：

1. **要绑定的完整主机名**（建议用二级域名，如 `portal.你的公司.com`，不要带 `https://`、路径、端口）
2. **指向目标**（二选一，以平台提供的为准）：
   - **CNAME**：指向平台对外域名（例如 `app.example.com`）——推荐
   - **A / AAAA**：指向平台入口的公网 IP

### 3.2 在域名服务商添加记录

以绑定 `portal.acme.com`、CNAME 到 `app.example.com` 为例：

| 类型 | 主机记录 / 名称 | 记录值 | TTL |
| --- | --- | --- | --- |
| CNAME | `portal`（或 `portal.acme.com`，视控制台写法而定） | `app.example.com` | 默认或 600 |

若平台要求 A 记录：

| 类型 | 主机记录 | 记录值 | TTL |
| --- | --- | --- | --- |
| A | `portal` | `<平台公网 IPv4>` | 默认或 600 |

注意：

- **不要**写成 `https://portal.acme.com` 或带路径
- 若域名已有冲突的 CNAME/A，先删除或改名再加
- 根域（`acme.com`）部分服务商不支持 CNAME，优先用子域（`portal.acme.com`）
- DNS 生效通常数分钟到 48 小时，可用下方命令自检

### 3.3 客户自检 DNS

本机执行：

```bash
# 应解析到平台提供的目标（CNAME 链或 IP）
dig +short portal.acme.com
# 或
nslookup portal.acme.com
```

浏览器直接访问 `http://portal.acme.com`（未上证书时可能仅 HTTP 或证书告警）——至少应能打到平台入口，而不是「无法解析」或无关站点。

DNS 未生效前，请勿要求平台「绑定失败」；先把解析做对。

---

## 4. 平台侧：控制台绑定（必做）

平台管理员在 **平台控制台 → 租户 → 编辑** 中：

1. 找到「自定义域名」
2. 填入客户提供的 hostname，例如：`portal.acme.com`
3. 保存

填写规则：

- 仅 hostname：小写字母、数字、连字符与点
- **不要**填 `https://`、`http://`、端口、路径、通配符（`*.acme.com`）
- 留空并保存 = 清除绑定
- 若提示「已被其他租户绑定」或「格式无效 / 保留主机名」，按提示修改

绑定后，应用按请求的 `Host` 识别租户；**不会**替客户改 DNS，也**不会**自动签发证书。

---

## 5. 运维侧：HTTPS 证书（生产必做）

应用容器内 Nginx 使用通配 `server_name _`，可按 Host 服务任意域名，但**浏览器 HTTPS 依赖宿主机（或前置负载均衡）证书是否包含该域名**。

常见做法（择一）：

1. **Certbot 为新域名扩证 / 另签**（宿主机 Nginx 终止 TLS 时）  
   ```bash
   # 示例：把 portal.acme.com 加入已有证书或单独申请
   certbot --nginx -d app.example.com -d portal.acme.com
   # 或
   certbot certonly --nginx -d portal.acme.com
   ```
2. **通配证书**（如 `*.acme.com` 由客户提供，或平台侧 `*.example.com` 仅覆盖平台子域，**不能**覆盖客户自有域）
3. **云负载均衡 / CDN**：在 LB/CDN 上为该域名配置证书与回源，回源 Host 保持客户域名

证书未覆盖时，典型现象：浏览器「连接不是私密连接」/ 证书域名不匹配；DNS 与控制台绑定都正确也会如此。

---

## 6. 推荐开通顺序

```text
1. 客户配置 DNS 并 dig 确认解析正确
2. 运维为该域名配置 TLS（证书生效）
3. 平台管理员在控制台填写并保存 custom_domain
4. 双方按 §7 验收
```

顺序 1→2→3 最稳妥。若先绑控制台再配 DNS，在解析生效前访问会落到错误主机或失败，属预期。

---

## 7. 验收清单

在客户域名上检查：

- [ ] `https://portal.acme.com` 证书无告警，能打开前台
- [ ] `https://portal.acme.com/login` 可打开；登录框**无**「用户名@组织标识」类多租户提示（与单租户体验一致）
- [ ] 该租户账号用裸用户名可登录；故意使用 `user@其他租户` 应失败
- [ ] 登录后可进入 `/app` 业务中台
- [ ] 访问 `/platform` 被挡回（不能进平台控制台）
- [ ] 主站 `https://app.example.com` 仍可多租户登录与平台管理

可选 API 抽查（在绑定域名下）：

```bash
curl -sS -H "Host: portal.acme.com" https://portal.acme.com/api/public/config | jq .
# data.bound_tenant 应为 { "slug": "<租户slug>", "name": "...", "logo_url": null|string, "favicon_url": null|string }
```

---

## 8. 常见问题

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| 域名无法解析 | DNS 未配或未生效 | 客户重查记录；等待 TTL |
| 证书错误 | 证书未含该域名 | 运维扩证 / 在 LB 配证 |
| 打开的是别的站点或 404 | DNS 指错 IP / 未指到本实例 | 核对 CNAME/A 目标 |
| 登录仍提示 `@组织` | 控制台未绑定或 Host 未传到应用 | 确认已保存 `custom_domain`；反代须透传 `Host` / `X-Forwarded-Host` |
| 提示域名已被占用 | 其他租户已绑定同一 hostname | 换域名或先清除原绑定 |
| 提示保留/无效域名 | 填了平台主域、localhost、带协议/端口等 | 按 §4 规则改正 |
| OAuth 回调跑回主域 | 未用当前域名发起登录，或回调 URL 写死主域 | 在绑定域名上点 OAuth；生产建议为各入口配置可达的回调（见部署文档） |

本阶段**不包含**：客户自助在租户设置里改域名、客户自定义域名的 DNS TXT 自动校验、每客户域名自动签发证书。平台通配子域与通配证书续期见 §0。

---

## 9. 给客户的简短说明模板

可复制发给客户：

```text
请为贵司配置自定义访问域名（示例：portal.贵司域名.com）：

1. 在域名 DNS 中新增 CNAME：
   主机记录：portal
   记录值：<平台对外域名，由我们提供>
   （若我们提供的是 IP，则改为 A 记录指向该 IP）

2. 配置完成后请回复我们；我们会：
   - 为该域名配置 HTTPS 证书
   - 在系统中完成租户域名绑定

3. 生效后请用 https://portal.贵司域名.com 访问前台与登录；
   登录账号使用贵司开通的用户名即可（无需加 @组织后缀）。
   平台管理后台仍只在主站域名开放，自定义域名上不可访问。
```
