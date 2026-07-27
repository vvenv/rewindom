# 单元测试

## 概述

单元测试模块定义了项目的测试策略、工具选型和最佳实践，确保代码质量和功能正确性。

## 技术选型

| 组件       | 技术                | 说明                 |
| ---------- | ------------------- | -------------------- |
| 测试框架   | Vitest              | 快速、轻量，支持 ESM |
| 断言库     | Vitest 内置         | 无需额外依赖         |
| 模拟库     | Vitest 内置         | Mock、Spy 功能       |
| 代码覆盖率 | Vitest 内置         | 生成覆盖率报告       |
| API 测试   | Supertest           | HTTP 请求模拟        |
| 数据库测试 | Prisma + 测试数据库 | 集成测试             |

## 测试分层

### 单元测试（Unit Tests）

- 测试单个函数或类
- 隔离外部依赖（使用 Mock）
- 快速执行（毫秒级）

### 集成测试（Integration Tests）

- 测试多个模块协作
- 包含数据库交互
- 验证数据流正确性

### E2E 测试（End-to-End Tests）

- 测试完整用户流程
- 使用真实浏览器
- 覆盖核心业务场景

## 测试组织

### 目录结构

```
packages/
├── server/
│   ├── src/
│   │   ├── services/
│   │   │   ├── document-service.ts
│   │   │   └── document-service.test.ts
│   │   ├── routes/
│   │   │   ├── documents.ts
│   │   │   └── documents.test.ts
│   │   └── lib/
│   │       ├── permissions.ts
│   │       └── permissions.test.ts
│   └── vitest.config.ts
├── client/
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── use-permissions.ts
│   │   │   └── use-permissions.test.ts
│   │   └── utils/
│   │       └── formatters.test.ts
│   └── vitest.config.ts
└── shared/
    ├── src/
    │   ├── field-permissions.ts
    │   └── field-permissions.test.ts
    └── vitest.config.ts
```

### 测试文件命名

- 测试文件与源文件同名，后缀 `.test.ts` / `.test.tsx`
- 目录结构与源文件保持一致

## 测试配置

### Vitest 配置

**server/vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "migrations/"],
    },
    setupFiles: ["src/test/setup.ts"],
  },
});
```

**client/vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/"],
    },
    setupFiles: ["src/test/setup.ts"],
  },
});
```

### 测试环境设置

**server/src/test/setup.ts**

```typescript
import { afterAll, beforeAll } from "vitest";
import { prisma } from "../lib/prisma";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

## 测试编写规范

### 测试命名

```typescript
describe("模块名称", () => {
  describe("功能描述", () => {
    it("应该做什么", () => {
      // 测试逻辑
    });

    it("在什么条件下应该做什么", () => {
      // 测试逻辑
    });
  });
});
```

### Mock 使用

```typescript
import { vi } from "vitest";

const mockCreate = vi.fn().mockResolvedValue({
  choices: [{ message: { content: "ok" } }],
});

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));
```

### 数据库测试

```typescript
describe("DocumentService", () => {
  beforeEach(async () => {
    await prisma.document.deleteMany();
  });

  it("应该创建文档", async () => {
    const document = await documentService.create({
      tenant_id: "test-tenant",
      title: "测试文档",
      file_path: "/path/to/file",
    });

    expect(document.title).toBe("测试文档");
    expect(document.status).toBe("DRAFT");
  });
});
```

### API 测试

```typescript
import request from "supertest";
import { app } from "../app";

describe("Documents API", () => {
  it("应该返回文档列表", async () => {
    const response = await request(app)
      .get("/api/documents")
      .set("Authorization", "Bearer " + token);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

## 测试覆盖率

### 覆盖率目标

| 模块   | 行覆盖率 | 分支覆盖率 | 函数覆盖率 |
| ------ | -------- | ---------- | ---------- |
| shared | ≥ 90%    | ≥ 80%      | ≥ 90%      |
| server | ≥ 80%    | ≥ 70%      | ≥ 80%      |
| client | ≥ 70%    | ≥ 60%      | ≥ 70%      |

### 覆盖率报告

生成覆盖率报告：

```bash
pnpm test -- --coverage
```

报告输出路径：`coverage/`

## 测试运行

### 运行所有测试

```bash
pnpm test
```

### 运行特定模块测试

```bash
pnpm --filter server test
pnpm --filter client test
pnpm --filter shared test
```

### 运行单个测试文件

```bash
pnpm --filter server test document-service.test.ts
```

### 监听模式

```bash
pnpm --filter server test -- --watch
```

## CI/CD 集成

### GitHub Actions 配置

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm test -- --coverage

      - uses: codecov/codecov-action@v3
        with:
          files: coverage/coverage-final.json
```

## 最佳实践

### 测试原则

1. **单一职责**：每个测试只验证一个行为
2. **隔离性**：测试之间相互独立
3. **可读性**：测试名称清晰描述预期行为
4. **可维护性**：测试代码与生产代码同步更新

### 测试策略

1. **先写测试**：TDD 方式，先写失败的测试再实现功能
2. **核心模块优先**：优先测试业务核心逻辑
3. **边界条件**：测试空值、异常、极限情况
4. **回归测试**：修复 bug 后添加测试用例

### Mock 策略

1. **外部依赖 Mock**：数据库、API、文件系统等
2. **保持 Mock 简单**：只返回必要的测试数据
3. **验证调用**：确保被 Mock 的函数被正确调用

### 测试数据

1. **使用工厂函数**：统一生成测试数据
2. **清理测试数据**：每个测试后清理数据库
3. **避免硬编码**：使用常量或生成器

## 常见问题

### 测试运行慢

- 使用 `--run` 模式而非 `--watch`
- 优化数据库连接池配置
- 减少不必要的测试数据

### Mock 不生效

- 确保 Mock 在导入之前
- 检查模块路径是否正确
- 使用 `vi.mocked()` 确保类型正确

### 覆盖率低

- 识别未覆盖的代码路径
- 添加边界条件测试
- 考虑测试的完整性而非数量

## 扩展阅读

- [Vitest 文档](https://vitest.dev/)
- [Prisma 测试指南](https://www.prisma.io/docs/guides/testing)
- [Supertest 文档](https://github.com/ladjs/supertest)
