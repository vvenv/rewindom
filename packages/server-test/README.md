# @rewindom/server-test

服务端单元测试基建：Prisma mock、Fastify 路由测试 helper、Vitest 配置工厂。

## 用法

```typescript
import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  prismaMock,
} from "@rewindom/server-test";
```

### Vitest 配置

**单包（Node）：**

```typescript
import { defineServerVitestConfig } from "@rewindom/server-test/vitest";

export default defineServerVitestConfig({
  root: import.meta.dirname,
});
```

**模块包（server / shared 子目录）：**

```typescript
import { defineModuleVitestConfig } from "@rewindom/client-test/vitest";

export default defineModuleVitestConfig(import.meta.dirname);
```

### 全量组装应用

需要注册全部路由时，从组装层导入：

```typescript
import { createTestApp } from "@rewindom/server/test";
```

## 运行

```bash
pnpm --filter @rewindom/builtin test
pnpm --filter @rewindom/server-kernel test
```
