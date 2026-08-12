# @be-water/client-test

前端单元测试基建：MSW、React Query wrapper、Vitest 配置工厂。

## 用法

```typescript
import { server } from "@be-water/client-test/server";
import {
  createQueryWrapper,
  createTestQueryClient,
} from "@be-water/client-test";
```

Mock `@be-water/client-kit` 筛选组件：

```typescript
vi.mock("@be-water/client-kit", async () => {
  const { clientShellTestMock } = await import(
    "@be-water/client-test/mocks/client-shell"
  );
  return clientShellTestMock;
});
```

### Vitest 配置

```typescript
import { defineClientVitestConfig } from "@be-water/client-test/vitest";

export default defineClientVitestConfig({
  root: import.meta.dirname,
});
```

模块包使用 `defineModuleVitestConfig`（见 `@be-water/server-test` README）。

## 运行

```bash
pnpm --filter @be-water/builtin test
pnpm --filter client test
```
