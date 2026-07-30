import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the monorepo root whether code runs from source layout
 * (`packages/server-kernel/src/lib/...`) or from the production server bundle
 * (`apps/server/dist/index.js`).
 */
export function findMonorepoRoot(
  fromUrl: string = import.meta.url,
  cwd: string = process.cwd(),
): string {
  const starts = [cwd, path.dirname(fileURLToPath(fromUrl))];

  for (const start of starts) {
    let dir = path.resolve(start);
    for (let i = 0; i < 8; i++) {
      if (isMonorepoRoot(dir)) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  }

  return path.resolve(cwd);
}

function isMonorepoRoot(dir: string): boolean {
  if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    return true;
  }
  return (
    fs.existsSync(path.join(dir, "package.json")) &&
    fs.existsSync(path.join(dir, "apps/server"))
  );
}
