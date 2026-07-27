import { configureServerPermissionCatalog } from "@be-water/server-kernel/runtime/permission-catalog.js";

/**
 * 测试用权限目录 fixture。
 *
 * 生产环境由宿主 `apps/server/src/server-assembly.ts` 注入已启用模块的权限并集；
 * 模块测试不加载宿主，需自行注入。
 *
 * **独立入口**（不经 `./index.js`）：`test-helper.ts` 依赖 `modules/rbac`，而 rbac
 * 自己的测试也要用本 fixture——走 barrel 会形成 test → server-test → rbac → test
 * 的循环初始化。
 *
 * 刻意用 fixture 而非 import 真实模块 manifest：后者会把各模块 server 代码拉进
 * 模块图；若再放进 vitest `setupFiles`，更会在测试的 `vi.mock` 生效**之前**加载并
 * 缓存 `permission.middleware.js` 等，令 prisma mock 失效。因此本函数须在
 * **测试文件内**调用，而非 setup 文件。
 */
export function installTestPermissionCatalog(
  extraPermissions: readonly {
    key: string;
    label: string;
    group: string;
    /** 省略即 `tenant`，与 `collectModulePermissions` 的默认一致。 */
    scope?: "tenant" | "platform";
  }[] = [],
): void {
  configureServerPermissionCatalog([
    {
      id: "test-fixture",
      version: "1.0.0",
      label: "Test Fixture",
      kind: "infrastructure",
      shared: {
        permissions: [
          { key: "users.read", label: "查看用户", group: "用户管理" },
          { key: "users.write", label: "编辑用户", group: "用户管理" },
          { key: "users.delete", label: "删除用户", group: "用户管理" },
          { key: "documents.read", label: "查看文档", group: "文档" },
          { key: "documents.write", label: "编辑文档", group: "文档" },
          { key: "products.read", label: "查看产品", group: "产品" },
          ...extraPermissions,
        ],
      },
    },
  ]);
}
