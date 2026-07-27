import { defineServerVitestConfig } from "@be-water/server-test/vitest";

export default defineServerVitestConfig({
  root: import.meta.dirname,
  setupFiles: ["./src/test/vitest-setup.ts"],
  include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
});
