import path from "node:path";

import { defineClientVitestConfig } from "@rewindom/client-test/vitest";

export default defineClientVitestConfig({
  root: import.meta.dirname,
  include: ["src/**/*.{test,spec}.{ts,tsx}"],
  alias: {
    "@": path.resolve(import.meta.dirname, "./src"),
  },
});
