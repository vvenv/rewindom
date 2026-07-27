import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const monorepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

let cachedVersion: string | undefined;

export function getAppVersion(): string {
  if (cachedVersion) return cachedVersion;

  const versionFile = path.join(monorepoRoot, "VERSION");
  if (fs.existsSync(versionFile)) {
    cachedVersion = fs.readFileSync(versionFile, "utf8").trim();
    return cachedVersion;
  }

  const packageJsonPath = path.join(monorepoRoot, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      version?: string;
    };
    cachedVersion = pkg.version ? `v${pkg.version}` : "dev";
    return cachedVersion;
  }

  cachedVersion = "dev";
  return cachedVersion;
}
