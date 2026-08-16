import path from "node:path";

import { defineClientVitestConfig } from "@rewindom/client-test/vitest";

export default defineClientVitestConfig({
  root: import.meta.dirname,
  /*
   * 第二条不是顺手加的：构建配置（`vite-manual-chunks`、`vite-marketing-ssr-proxy`）
   * 住在包根而不是 `src/`，只写 `src/**` 时它们的测试**一次都没跑过**——文件在、
   * 断言也是对的，CI 却始终显示全绿。
   */
  include: [
    "src/**/*.{test,spec}.{ts,tsx}",
    "*.{test,spec}.{ts,tsx}",
  ],
  alias: {
    "@": path.resolve(import.meta.dirname, "./src"),
  },
});
