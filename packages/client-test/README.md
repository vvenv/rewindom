# @rewindom/client-test

前端单元测试基建：MSW、React Query wrapper、Vitest 配置工厂。

## 用法

```typescript
import { server } from "@rewindom/client-test/server";
import {
  createQueryWrapper,
  createTestQueryClient,
} from "@rewindom/client-test";
```

Mock `@rewindom/client-kit` 筛选组件：

```typescript
vi.mock("@rewindom/client-kit", async () => {
  const { clientShellTestMock } = await import(
    "@rewindom/client-test/mocks/client-shell"
  );
  return clientShellTestMock;
});
```

### Vitest 配置

```typescript
import { defineClientVitestConfig } from "@rewindom/client-test/vitest";

export default defineClientVitestConfig({
  root: import.meta.dirname,
});
```

模块包使用 `defineModuleVitestConfig`（见 `@rewindom/server-test` README）。

## 运行

```bash
pnpm --filter @rewindom/builtin test
pnpm --filter client test
```
