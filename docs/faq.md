# FAQ

## 概述

本文档汇总了 be-water 系统常见问题及解决方案。

## 技术问题

### Q1: 后台任务一直处于 PENDING 状态怎么办？

**原因**：队列 Worker 未启动或队列积压。

**解决方案**：

1. 检查 BullMQ Worker 是否运行：
   ```bash
   pm2 status
   ```

2. 启动 Worker：
   ```bash
   pm2 start ecosystem.config.js --only worker
   ```

3. 查看队列状态：
   ```bash
   # 进入 Redis 命令行
   redis-cli
   # 查看队列长度（<queue> 为模块注册的队列名）
   LLEN bull:<queue>:wait
   ```

### Q2: 数据库连接失败怎么办？

**原因**：数据库配置错误或服务未启动。

**解决方案**：

1. 检查数据库服务状态：
   ```bash
   systemctl status postgresql
   ```

2. 验证数据库连接：
   ```bash
   psql -U be-water -d be-water -h localhost
   ```

3. 检查环境变量配置：
   ```bash
   echo $DATABASE_URL
   ```

### Q3: JWT Token 过期怎么办？

**原因**：Token 超过有效期。

**解决方案**：

1. 用户重新登录获取新 Token。
2. 如需调整过期时间，修改环境变量：
   ```env
   JWT_EXPIRES_IN=30d
   ```

### Q4: OpenAI API 调用失败怎么办？

**原因**：API Key 无效、余额不足或网络问题。

**解决方案**：

1. 检查 API Key：
   ```bash
   echo $OPENAI_API_KEY
   ```

2. 验证 API Key 有效性：
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
   ```

3. 检查网络连接：
   ```bash
   ping api.openai.com
   ```

### Q5: 前端页面无法加载怎么办？

**原因**：前端构建失败或静态文件路径错误。

**解决方案**：

1. 重新构建前端：
   ```bash
   pnpm --filter client build
   ```

2. 检查 Nginx 配置：
   ```nginx
   root /path/to/be-water/apps/client/dist;
   ```

3. 查看浏览器控制台错误信息。

### Q6: 服务启动后无法访问怎么办？

**原因**：端口被占用或防火墙阻止。

**解决方案**：

1. 检查端口占用：
   ```bash
   lsof -i :3000
   ```

2. 释放端口：
   ```bash
   kill -9 <PID>
   ```

3. 检查防火墙：
   ```bash
   ufw allow 3000
   ```

## 业务问题

### Q7: 如何为租户开通/停用某个模块？

**步骤**：

1. 以平台管理员登录，进入平台管理端的租户列表
2. 选择目标租户，打开「功能开关」
3. 勾选或取消对应模块（模块在 manifest 的 `tenantEntitlements` 中声明）
4. 保存后即时生效——未开通的模块不挂载路由、不进侧边栏

### Q8: 如何管理用户权限？

**步骤**：

1. 登录系统，进入用户管理页面
2. 选择需要修改权限的用户
3. 勾选或取消相应的权限项
4. 保存权限配置

### Q9: 如何查看错误日志？

**步骤**：

1. 登录系统，进入错误日志页面
2. 使用筛选条件过滤日志（级别、时间、用户等）
3. 点击日志条目查看详情
4. 导出日志或清理历史日志

## 开发问题

### Q10: 如何添加新的权限项？

业务权限由**所属模块**声明，不再集中在 `packages/shared`：

1. 在模块 manifest 的 `shared.permissions` 中追加条目（样板见
   `packages/modules/notes/server/module.ts`）
2. 路由上用 `app.requirePermission("<key>")` 守卫
3. 运行测试：
   ```bash
   pnpm --filter @be-water/modules test
   ```

### Q11: 如何创建新的 API 路由？

**步骤**：

1. 在所属模块的 `server/` 下新建 `*.routes.ts`
2. 定义路由处理函数与权限要求
3. 在该模块 `module.ts` 的 `server.registerRoutes` 中注册
4. 若模块受租户开关控制，用 `registerTenantGatedRoutes` 包一层
5. 前端经 `@/lib/api` 调用，编写测试用例

> 新建整个模块用 `create-module` skill，不要往 `apps/server/src/routes/` 里加业务路由。

### Q12: 如何添加新的数据库模型？

**步骤**：

1. 在 `apps/server/prisma/schema.prisma` 中添加模型定义
2. 生成迁移：
   ```bash
   pnpm --filter server exec prisma migrate dev --name add-new-model
   ```
3. 部署迁移：
   ```bash
   pnpm --filter server exec prisma migrate deploy
   ```
4. 更新共享类型（`packages/shared/src/index.ts`）

### Q13: 如何添加新的前端页面？

**步骤**：

1. 在所属模块的 `client/pages/` 下创建页面组件
2. 在该模块 `client/module.tsx` 的路由贡献中注册
3. 侧边栏入口经模块 manifest 的 nav 贡献声明，不要改 `app-nav.ts`
4. 页面按 Page / Hook / Lib / Component 四层拆分（`frontend-page-structure` skill）
5. 编写测试用例

### Q14: 如何运行特定模块的测试？

```bash
# 运行 server 模块测试
pnpm --filter server test

# 运行 client 模块测试
pnpm --filter client test

# 运行 shared 模块测试
pnpm --filter shared test

# 运行所有业务模块测试
pnpm --filter @be-water/modules test

# 运行单个测试文件
pnpm --filter server test <file>.test.ts
```

### Q15: 如何生成代码覆盖率报告？

```bash
pnpm test -- --coverage
```

报告输出路径：`coverage/`

## 部署问题

### Q16: 如何备份数据库？

在服务器上以 root 运行备份脚本（备份 PostgreSQL + Redis）：

```bash
bash /etc/be-water/scripts/backup.sh --env production   # 或 --env test
```

产物在 `/var/backups/app`：`app_backup_<时间戳>.dump`（PG）、`app_redis_backup_<时间戳>.rdb.gz`（Redis）。
定时备份用 `./scripts/backup-cron.sh install --env production` 安装。

也可在本地直接拉取远程备份：`./scripts/db-remote.sh pull --env production --fresh`。

### Q17: 如何恢复数据库？

在服务器上以 root 运行还原脚本（与备份对称，还原前自动做安全备份）：

```bash
bash /etc/be-water/scripts/restore.sh --env production --list      # 列出可用备份
bash /etc/be-water/scripts/restore.sh --env production --latest    # 还原最新 PG 备份
```

也可在本地把备份推到远程还原：`./scripts/db-remote.sh push --env production --file <pg.dump> --yes`。

若要还原到本地开发库（macOS，复用 `db:pull` 拉取的备份）：`./scripts/restore-local.sh --latest`（先 `pnpm db:pull -- --env production --fresh` 拉取）。

注意：还原会清空当前数据库。PG 还原后会把对象所有权归还 `be-water`，Prisma migration 可正常工作。

### Q18: 如何更新系统版本？

```bash
git pull
pnpm install
pnpm build
pm2 restart be-water-server
```

### Q19: 如何配置 HTTPS？

使用 Let's Encrypt：

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

### Q19b: 租户自定义域名要客户做什么？

客户在自己的域名服务商把子域（如 `portal.acme.com`）用 **CNAME** 指到平台对外域名，或用 **A** 指到平台入口 IP；平台管理员在控制台绑定 hostname；运维为该域名配置 HTTPS。三者缺一不可。

完整步骤、验收清单与可转发客户的说明模板见 [`custom-domain.md`](./custom-domain.md)。

### Q20: 如何查看服务状态？

```bash
# PM2 状态
pm2 status

# Docker 状态
docker-compose ps

# 健康检查
curl http://localhost:3000/health
```

## 性能问题

### Q21: 数据库查询慢怎么办？

**解决方案**：

1. 查看慢查询日志：
   ```sql
   SET log_statement = 'all';
   SET log_min_duration_statement = '100ms';
   ```

2. 为租户级表补索引（租户列几乎总该在最左）：
   ```sql
   CREATE INDEX ON "Note" ("tenant_id", "created_at");
   ```

   慢查询可在平台管理端的**慢查询**页面直接定位（`slow-query` 模块）。

3. 优化查询语句：
   - 使用 `EXPLAIN ANALYZE` 分析查询计划
   - 避免 `SELECT *`，只选择需要的字段

### Q22: 内存使用过高怎么办？

**解决方案**：

1. 检查内存使用：
   ```bash
   free -h
   ```

2. 优化 Node.js 内存配置：
   ```bash
   node --max-old-space-size=4096 dist/index.js
   ```

3. 增加服务器内存或使用集群模式：
   ```javascript
   instances: "max",
   exec_mode: "cluster",
   ```

## 安全问题

### Q23: 如何防止 SQL 注入？

**解决方案**：

1. 使用 Prisma ORM，自动参数化查询
2. 避免使用 `$queryRawUnsafe`
3. 使用 `$queryRaw` 参数化查询：
   ```typescript
   await prisma.$queryRaw`SELECT * FROM "User" WHERE "email" = ${email}`;
   ```

### Q24: 如何防止 XSS 攻击？

**解决方案**：

1. 使用 React 自动转义 HTML
2. 对用户输入进行过滤和转义
3. 使用 `dangerouslySetInnerHTML` 时特别小心

### Q25: 如何保护敏感数据？

**解决方案**：

1. 使用环境变量存储敏感配置
2. 使用 BYOK（Bring Your Own Key）模式
3. 对数据库敏感字段进行加密
4. 定期轮换密钥

## 其他问题

### Q26: 如何联系技术支持？

请通过以下方式联系技术支持：

- 邮箱：support@be-water.com
- 钉钉群：XXX
- GitHub Issues：提交问题到项目仓库

### Q27: 如何获取系统更新通知？

关注项目 GitHub 仓库的 Release 页面，或订阅邮件通知。

### Q28: 如何贡献代码？

1. Fork 项目仓库
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request
5. 等待审核和合并

### Q29: 系统支持哪些浏览器？

- Chrome（推荐）
- Firefox
- Safari
- Edge

建议使用最新版本浏览器以获得最佳体验。
