# 用户系统设计文档

> **重要说明**：本文档中的代码示例使用的是概念性的 API 调用，仅供参考。实际开发中，**必须**使用 `@rewindom/client-kit` 的 `api`（或 `createApiClient`）进行所有 API 调用。该工具已封装了 Token 管理、自动刷新、错误处理等功能。详见项目编码规范 `.cursor/rules/coding-standards.mdc`。

## 一、系统概述

本文档描述 Rewindom 的用户认证与授权系统，采用标准的 JWT Token 机制，支持用户注册、登录、密码加密、滑块验证码、Access Token 与 Refresh Token 刷新等功能。

### 1.1 四类 Actor

JWT / 请求上下文用 `actor_type` 区分身份（见 `packages/shared/src/auth-actor.ts`）：

| actor_type | 身份表 | 活动范围 | 说明 |
| --- | --- | --- | --- |
| `tenant_user` | `User` | `/app` 工作台 | 租户运营者；权限走 PBAC（`UserRole` / Role） |
| `platform_admin` | `PlatformAdmin` | `/platform/*` | 平台控制台；独立表 + 路径白名单 |
| `api_key` | `TenantApiKey` | `/api` 白名单 | 机器调用；路径黑名单限制 |
| `site_member` | `SiteMember` | 站点前台 + `/member/*` | 租户站点的终端会员；**不进工作台、不进 PBAC** |

站点会员是独立身份层：独立 refresh token 表、**HttpOnly cookie** 会话（与工作台 localStorage Bearer 隔离）、独立 `createApiClient`（`authMode: "cookie"`）。`marketing` 通过 Component Slot / SSR 注入点接入会员入口与门控，不反向依赖 `site-member`。

> **多租户**：登录标识为 `username@tenant_slug`，默认租户 `default` 可省略后缀；**租户侧 UI 无感知**；平台管理员见 [`tenant-config.md`](./tenant-config.md) §5.8、§10.3。单租户部署见 `SINGLE_TENANT`。

## 二、技术选型

### 后端技术

- **Fastify 5** - Web 框架
- **Prisma 7** - ORM
- **PostgreSQL** - 数据库
- **bcrypt** - 密码加密
- **@fastify/jwt** - Fastify JWT 插件（内部封装 jsonwebtoken）

### 前端技术

- **React 19** - UI 框架
- **TanStack Query** - 数据请求与缓存
- 滑块验证码组件

## 三、数据模型设计

### User 表（工作台租户用户）

权限不再用内嵌 `Role` 枚举，而是 PBAC：`User` ↔ `UserRole` ↔ `Role`（见 [`permission-system.md`](./permission-system.md)）。`is_system_admin` 表示租户内系统管理员捷径。

```prisma
model User {
  id                    String    @id @default(uuid())
  tenant_id             String
  username              String
  password              String?   // bcrypt；OAuth 用户可为 null
  is_system_admin       Boolean   @default(false)
  enabled               Boolean   @default(true)
  last_login_at         DateTime?
  failed_login_attempts Int       @default(0)
  locked_until          DateTime?
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  // 另有 UserRole / RefreshToken / AuditLog 等关联（见 kernel schema）

  @@unique([tenant_id, username])
  @@index([tenant_id])
}
```

### SiteMember 表（站点会员）

终端客户，独立于 `User`。字段含 `email`、`password?`、`display_name`、`email_verified_at?`、`enabled`、登录锁定计数等；`@@unique([tenant_id, email])`。配套 `SiteMemberRefreshToken`。详见 `packages/builtin/site-member/schema.prisma`。

### RefreshToken 表

```prisma
model RefreshToken {
  id           String    @id @default(uuid())
  user_id      String
  token        String    @unique
  expires_at   DateTime
  created_at   DateTime @default(now())
  revoked      Boolean   @default(false)
  user         User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
}
```

### AuditLog 审计日志表

```prisma
model AuditLog {
  id          String    @id @default(uuid())
  user_id     String
  action      String    // 操作类型
  resource    String?   // 操作的资源类型（user、note 等，由各模块定义）
  details     String?   // 操作详情（JSON）
  ip_address  String?
  user_agent  String?
  created_at  DateTime  @default(now())

  user        User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([action])
  @@index([created_at])
}
```

## 四、认证流程设计

### 4.1 用户注册

**流程**：

1. 客户端提交注册表单（账号、密码、滑块验证码 token）
2. 服务端验证滑块验证码
3. 验证账号格式和唯一性（租户内唯一）
4. 验证密码强度
5. 使用 bcrypt 加密密码（salt rounds: 10）
6. 创建用户记录（归属当前租户或 default 租户）
7. 返回成功响应

**API 接口**：

```
POST /api/auth/register
```

**请求体**：

```json
{
  "username": "user123",
  "password": "SecurePass123!",
  "captcha_token": "滑块验证码_token"
}
```

**响应**：

```json
{
  "data": {
    "user_id": "uuid",
    "username": "user123"
  }
}
```

### 4.2 用户登录

**流程**：

1. 客户端提交登录表单（账号、密码、滑块验证码 token）
2. 服务端验证滑块验证码
3. **解析登录标识**（支持多租户格式 `username@tenant_slug`，默认租户 `default` 可省略）
4. 查询租户记录（多租户场景）
5. 查询用户记录
6. 检查账户是否被锁定
7. 使用 bcrypt 验证密码
8. 验证成功后：
   - 生成 Access Token（有效期 15 分钟，包含 `tenant_id` 和 `tenant_slug`）
   - 生成 Refresh Token（有效期 7 天）
   - 保存 Refresh Token 到数据库
   - 更新用户最后登录时间
   - 重置失败登录次数
9. 验证失败时：
   - 增加失败登录次数
   - 如果失败次数 >= 5，锁定账户 30 分钟
10. 返回 Token 信息

### 4.2.1 第三方 OAuth 登录（GitHub / Google / Microsoft）

**凭证只有平台一层**：env（`GITHUB_*` / `GOOGLE_*` / `MICROSOFT_*`），`resolvePlatformOAuthCredentials()`，**不查库**。`GET /api/public/config` 返回 `github_oauth_enabled` / `google_oauth_enabled` / `microsoft_oauth_enabled`，与当前 Host 绑定哪个租户无关。

站点覆盖只作用于**会员登录**（见 §4.2.2）：工作台成员是平台的客户，授权页上显示平台的应用名才是对的归属；给中台开租户覆盖等于让「Acme 的员工用 Acme 的 App 登平台的后台」这条链路存在。代价是多租户下 Acme 员工在授权页看到的是平台名而不是 Acme——这是有意为之，不是 bug。

| Provider | 启动 | 回调 |
| --- | --- | --- |
| GitHub | `GET /api/auth/oauth/github` | `GET /api/auth/oauth/github/callback` |
| Google | `GET /api/auth/oauth/google` | `GET /api/auth/oauth/google/callback` |
| Microsoft | `GET /api/auth/oauth/microsoft` | `GET /api/auth/oauth/microsoft/callback` |

**流程**（三家相同）：

1. 浏览器跳转启动 URL（带短时 JWT `state`）
2. 授权后进入回调，换取 access token 并拉取用户资料
3. 若已有 `OAuthAccount` 绑定 → 签发双 Token
4. 若无绑定且平台开放自助注册 → 创建个人租户 + 无密码管理员用户 + `OAuthAccount`，再签发 Token
5. 若无绑定且未开放注册 → 前端回调页提示联系管理员
6. 成功时 302 到 `{origin}/auth/oauth/callback#access_token=…&refresh_token=…`（hash 避免 Referer 泄露）

登录页与注册页均展示已启用的 OAuth 按钮（首次 OAuth 与注册等价）。

`User.password` 可为 null（纯 OAuth 账号）；密码登录对这些账号会失败，修改密码接口返回 `auth.password_not_set`。

### 4.2.2 站点会员第三方登录（`SiteMember`）

会员身份独立于工作台 `User`。会员体系每个站点都具备（没有开关），`GET /api/member/config` 返回三家 `*_oauth_enabled`；登录/注册页展示按钮。

**凭证分层**（与工作台不同，这条**有**站点覆盖）：平台 env → 站点覆盖，`resolveSiteOAuthCredentials(provider, tenantId)`，加密存 `TenantSetting.secret`，key=`site_oauth_providers`。站长在**会员页顶部**（`/app/site-members`）的「第三方登录」一行配置，权限 `site_members.read` / `site_members.write`；配了自己的 App，访客在授权页看到的就是站点自己的名字与图标。与 `site-billing` 的收款凭证同一形态。

| 步骤 | 路径 |
| --- | --- |
| 启动 | `GET /api/member/oauth/{provider}?redirect=` |
| IdP 回调（与工作台共用） | `GET /api/auth/oauth/{provider}/callback`（`state.typ = member_oauth_*`） |
| 换票种 Cookie | `POST /api/member/oauth/exchange` `{ code }` |
| 前端落地 | `/member/oauth/callback` |

工作台与会员共用同一条 IdP Redirect URI（`*_CALLBACK_URL` / 默认 `{FRONTEND_URL}/api/auth/oauth/{provider}/callback`）；统一回调里按 state JWT 的 `typ` 分流（会员逻辑由 `MemberOAuthCallbackProvider` 注入）。

会员 Cookie 按 Host 隔离：回调落在 `FRONTEND_URL` 后，若与发起 Host 不同源则发一次性 exchange code，再跳回发起域名种 Cookie。绑定表 `SiteMemberOAuthAccount` 按 `(tenant_id, provider, provider_user_id)` 唯一；首次登录要求 IdP **已验证邮箱**，可自动绑定同邮箱已有会员或创建 `password: null` 的新会员。

**API 接口**：

```
POST /api/auth/login
```

**请求体**：

```json
{
  "username": "user123",
  "password": "SecurePass123!",
  "captcha_token": "滑块验证码_token"
}
```

**响应**：

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "username": "user123"
    }
  }
}
```

### 4.3 Token 刷新

**流程**：

1. 客户端使用 Refresh Token 请求新的 Access Token
2. 服务端验证 Refresh Token：
   - 检查数据库中是否存在
   - 检查是否已撤销
   - 检查是否过期
3. 验证成功后：
   - 生成新的 Access Token
   - 生成新的 Refresh Token
   - 撤销旧的 Refresh Token
   - 保存新的 Refresh Token
4. 返回新的 Token 信息

**API 接口**：

```
POST /api/auth/refresh
```

**请求体**：

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**响应**：

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900
  }
}
```

### 4.4 修改密码

**流程**：

1. 用户提交修改密码请求（旧密码、新密码）
2. 服务端验证旧密码
3. 验证新密码强度
4. 使用 bcrypt 加密新密码
5. 更新用户密码
6. 返回成功响应

**API 接口**：

```
POST /api/auth/change-password
```

### 4.5 重置用户密码（仅超级用户）

**流程**：

1. 超级用户提交重置密码请求
2. 服务端验证请求者是否为超级用户
3. 生成随机密码（16位，包含大小写字母、数字、特殊字符）
4. 使用 bcrypt 加密新密码
5. 更新目标用户密码
6. 返回新密码（仅一次显示）

**API 接口**：

```
POST /api/users/:id/reset-password
```

### 4.6 用户登出

**流程**：

1. 客户端发送登出请求（携带 Refresh Token）
2. 服务端撤销数据库中的 Refresh Token
3. 返回成功响应
4. 客户端清除本地存储的 Token

**API 接口**：

```
POST /api/auth/logout
```

## 五、安全机制

### 5.1 密码加密

使用 bcrypt 进行密码哈希：

- Salt rounds: 10
- 存储格式: `$2b$10$...`

### 5.2 滑块验证码验证

使用滑块验证码防止自动化攻击，国内用户友好，无需 Google 服务。

### 5.3 JWT Token 配置

**Access Token**：

- 算法: HS256
- 有效期: 15 分钟
- Payload: `{ userId, actor_type, is_system_admin, type: "access", tenant_id?, tenant_slug? }`
  - `actor_type`: `tenant_user` | `platform_admin` | `api_key` | `site_member`
  - 平台管理员可无 `tenant_id` / `tenant_slug`
  - **不再**使用已废弃的 `role` 字段

**Refresh Token**：

- 算法: HS256
- 有效期: 7 天
- 存储在对应身份的 refresh 表（`RefreshToken` / `PlatformAdminRefreshToken` / `SiteMemberRefreshToken`），可撤销

**环境变量**：

```env
JWT_SECRET=your-secret-key-min-32-chars
```

### 5.4 登录失败限制

- 失败次数 >= 5：锁定账户 30 分钟
- 锁定期间无法登录
- 成功登录后重置失败次数

### 5.5 Token 存储策略

**工作台（`tenant_user` / `platform_admin`）客户端**：

- Access Token + Refresh Token：localStorage（`rewindom_access_token` / `rewindom_refresh_token`）
- 请求头：`Authorization: Bearer`

**站点会员（`site_member`）**：

- Access + Refresh JWT：HttpOnly cookie（`rewindom_member_access` / `rewindom_member_refresh`，`SameSite=Lax`，Host-only）
- JSON 登录响应**不**返回 token 字符串；API 请求 `credentials: "include"`
- 官网 SSR 可读 cookie：首屏直接渲染账号菜单并解锁会员门控页

**服务端**：

- Refresh Token：存储在数据库，支持撤销

## 六、API 路由设计

### 认证路由 `/api/auth`

| 方法 | 路径                        | 说明         | 需要认证 |
| ---- | --------------------------- | ------------ | -------- |
| POST | `/api/auth/register`        | 用户注册     | 否       |
| POST | `/api/auth/login`           | 用户登录     | 否       |
| POST | `/api/auth/refresh`         | 刷新 Token   | 否       |
| POST | `/api/auth/logout`          | 用户登出     | 否       |
| GET  | `/api/auth/me`              | 获取当前用户 | 是       |
| POST | `/api/auth/change-password` | 修改密码     | 是       |

### 用户管理路由 `/api/users`（仅超级用户）

| 方法   | 路径                            | 说明         | 权限要求 |
| ------ | ------------------------------- | ------------ | -------- |
| GET    | `/api/users`                    | 获取用户列表 | 超级用户 |
| POST   | `/api/users`                    | 创建用户     | 超级用户 |
| GET    | `/api/users/:id`                | 获取单个用户 | 超级用户 |
| PUT    | `/api/users/:id`                | 更新用户信息 | 超级用户 |
| DELETE | `/api/users/:id`                | 删除用户     | 超级用户 |
| POST   | `/api/users/:id/reset-password` | 重置用户密码 | 超级用户 |

## 七、环境变量配置

```env
# JWT 配置
JWT_SECRET=your-super-secret-key-at-least-32-characters-long

# 数据库
DATABASE_URL="postgresql://rewindom:password@localhost:5432/app"

# Redis（BullMQ 任务队列）
REDIS_URL="redis://localhost:6379"

# LLM（OpenAI 兼容接口）
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# 平台管理员（Phase 1+）
PLATFORM_ADMIN_USERNAME=platform_admin
PLATFORM_ADMIN_PASSWORD=<generated-on-bootstrap>
```

## 八、审计日志分类

### 用户账号操作

| Action            | 说明                     |
| ----------------- | ------------------------ |
| `LOGIN`           | 用户成功登录             |
| `LOGOUT`          | 用户登出                 |
| `LOGIN_FAILED`    | 登录失败                 |
| `USER_CREATE`     | 创建用户（超级用户）     |
| `USER_DELETE`     | 删除用户（超级用户）     |
| `USER_UPDATE`     | 更新用户信息（超级用户） |
| `PASSWORD_CHANGE` | 修改密码                 |
| `PASSWORD_RESET`  | 重置密码（超级用户）     |

### 业务操作

| Action                   | 说明                   |
| ------------------------ | ---------------------- |
| `NOTE_CREATE`            | 创建笔记（示例模块）   |
| `NOTE_UPDATE`            | 更新笔记（示例模块）   |
| `NOTE_DELETE`            | 删除笔记（示例模块）   |
| `TENANT_REGISTER`        | 新租户注册             |
| `TENANT_FEATURES_UPDATE` | 平台管理员修改功能开关 |
| `TENANT_LIMITS_UPDATE`   | 平台管理员修改配额     |
| `PLAN_UPGRADE`           | 套餐升级               |

## 九、实施步骤

1. **数据库模型更新**
   - 添加 User、RefreshToken、AuditLog 模型
   - 执行数据库迁移

2. **后端实现**
   - 安装依赖：`bcrypt`, `@fastify/jwt`
   - 注册 @fastify/jwt 插件
   - 实现认证路由：register, login, refresh, logout
   - 实现认证中间件（auth.ts）
   - 实现权限中间件（permission.ts）
   - 实现全局错误处理中间件（error-handler.ts）
   - 实现 AuditService

3. **前端实现**
   - 实现 AuthContext（AuthContext.tsx）
   - 实现登录/注册表单页面
   - 实现 api.ts 的 Token 自动刷新逻辑
   - 实现用户管理页面（超级用户）

4. **测试**
   - 单元测试：密码加密、Token 生成/验证
   - 集成测试：完整认证流程
   - 安全测试：滑块验证码、登录失败限制

## 十、注意事项

1. **JWT Secret 安全**：使用强随机密钥，至少 32 字符
2. **HTTPS**：生产环境必须使用 HTTPS
3. **密码策略**：强制复杂密码（至少 8 位，包含大小写字母、数字、特殊字符）
4. **Token 存储**：工作台 Access/Refresh 存 localStorage + Bearer；站点会员用 HttpOnly cookie
5. **日志记录**：记录登录失败、异常登录等安全事件
6. **定期清理**：定期清理过期的 Refresh Token 和审计日志
7. **多租户隔离**：所有业务查询必须带 `tenant_id` 过滤
