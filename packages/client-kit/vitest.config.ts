import { defineClientVitestConfig } from "@be-water/client-test/vitest";

export default defineClientVitestConfig({
  root: import.meta.dirname,
  include: ["src/**/*.{test,spec}.{ts,tsx}"],
});
