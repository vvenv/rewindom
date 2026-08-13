#!/usr/bin/env node
/**
 * Bundle apps/server for production:
 * - Inline workspace packages (@rewindom/*) that ship TypeScript source
 * - Inline transitive deps that only those packages declare (e.g. pinyin-pro)
 * - Leave apps/server's own dependencies + native/engine packages external
 *
 * Output: dist/index.js — start with plain `node dist/index.js`.
 */
import * as esbuild from "esbuild";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..");
const outfile = path.join(serverRoot, "dist", "index.js");

const pkg = JSON.parse(
  await readFile(path.join(serverRoot, "package.json"), "utf8"),
);
const serverRuntimeDeps = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.optionalDependencies ?? {}),
]);

/** Always external: native addons, Prisma engines, worker/wasm loaders. */
const FORCED_EXTERNAL = [
  /^@prisma\//,
  /^bcrypt$/,
  /^tesseract\.js(?:\/|$)/,
  /^thread-stream$/,
  /^pdf-parse$/,
];

function packageNameOf(id) {
  if (id.startsWith("@")) {
    const parts = id.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : id;
  }
  return id.split("/")[0] ?? id;
}

function isWorkspacePackage(name) {
  return name.startsWith("@rewindom/");
}

function isBarePackageImport(id) {
  return !(id.startsWith("./") || id.startsWith("../") || path.isAbsolute(id));
}

function shouldExternalize(id) {
  if (id.startsWith("node:")) {
    return true;
  }
  if (FORCED_EXTERNAL.some((pattern) => pattern.test(id))) {
    return true;
  }
  const name = packageNameOf(id);
  if (isWorkspacePackage(name)) {
    return false;
  }
  return serverRuntimeDeps.has(name);
}

const externalPackagesPlugin = {
  name: "external-server-and-native-packages",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (!isBarePackageImport(args.path)) {
        return undefined;
      }
      if (!shouldExternalize(args.path)) {
        return undefined;
      }
      return { path: args.path, external: true };
    });
  },
};

await rm(path.join(serverRoot, "dist"), { recursive: true, force: true });
await mkdir(path.join(serverRoot, "dist"), { recursive: true });

await esbuild.build({
  absWorkingDir: serverRoot,
  entryPoints: [path.join(serverRoot, "src", "index.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  banner: {
    js: 'import { createRequire as __rewindomCreateRequire } from "node:module";\nconst require = __rewindomCreateRequire(import.meta.url);',
  },
  logLevel: "info",
  plugins: [externalPackagesPlugin],
});

// Sanity: ensure a known workspace-only transitive dep was inlined (not left bare).
const bundled = await readFile(outfile, "utf8");
if (bundled.includes('from "pinyin-pro"') || bundled.includes("from 'pinyin-pro'")) {
  console.error(
    "[bundle] pinyin-pro was left external; it is not an apps/server dependency and will fail at runtime",
  );
  process.exit(1);
}

console.log(`[bundle] wrote ${path.relative(serverRoot, outfile)}`);
