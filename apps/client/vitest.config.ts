import path from "node:path";

import { defineClientVitestConfig } from "@be-water/client-test/vitest";

export default defineClientVitestConfig({
  root: import.meta.dirname,
  include: ["src/**/*.{test,spec}.{ts,tsx}"],
  alias: {
    "@": path.resolve(import.meta.dirname, "./src"),
  },
});
