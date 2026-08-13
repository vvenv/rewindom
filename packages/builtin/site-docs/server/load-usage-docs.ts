/**
 * 默认租户文档库的初始内容（`docs/usage/<locale>/*.md`）。
 *
 * 内容来自构建期生成的 `usage-docs.generated.ts`，**不在运行时读 `fs`**：生产构建把
 * `apps/server` 打成单文件 bundle，`import.meta.url` 指向 `dist/index.js`，任何相对
 * 路径读取都会落到不存在的目录上。真源与再生成方式见 `docs/usage/assemble.mjs`。
 */

import {
  USAGE_DOCS,
  type UsageDocFile,
} from "./usage-docs.generated.js";

export function loadUsageDocs(): readonly UsageDocFile[] {
  return USAGE_DOCS;
}

export type { UsageDocFile };
