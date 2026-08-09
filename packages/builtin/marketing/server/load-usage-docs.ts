import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseMarkdownFile } from "../shared/marketing-doc.js";

const USAGE_DOCS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../docs/usage",
);

/** 扫描 `docs/usage/*.md`，按 frontmatter 的 `sort_order` 排序。 */
export function loadUsageDocs(): Array<{ filename: string; raw: string }> {
  return readdirSync(USAGE_DOCS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .map((file) => ({
      filename: file,
      raw: readFileSync(path.join(USAGE_DOCS_DIR, file), "utf8"),
    }))
    .sort((left, right) => {
      const a = parseMarkdownFile(left.filename, left.raw);
      const b = parseMarkdownFile(right.filename, right.raw);
      return a.sort_order - b.sort_order || left.filename.localeCompare(right.filename);
    });
}
