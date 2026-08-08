import { defineConfig } from "vitest/config";

// Standalone config for CAM-12 verifier tests only.
// Keeps the main harness (`pnpm test`) unchanged at its original test count.
export default defineConfig({
  test: {
    include: ["verifier/**/*.{test,spec}.{ts,tsx}"],
  },
});
