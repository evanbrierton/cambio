import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}", "party/**/*.{test,spec}.{ts,tsx}"],
  },
});
