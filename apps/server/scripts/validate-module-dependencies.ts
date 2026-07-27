#!/usr/bin/env tsx
/* eslint-disable no-console */
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectModuleDependencyViolations,
  formatModuleDependencyViolations,
} from "./lib/module-dependency-rules.js";
import { SERVER_MODULE_MANIFEST } from "./lib/module-manifest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(serverRoot, "../..");

const violations = collectModuleDependencyViolations(
  serverRoot,
  monorepoRoot,
  SERVER_MODULE_MANIFEST,
);

const message = formatModuleDependencyViolations(violations);
if (message) {
  console.error(message);
  process.exit(1);
}

console.log(
  `Module dependency check passed (${SERVER_MODULE_MANIFEST.length} modules).`,
);
