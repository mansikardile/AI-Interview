import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve("src"), "server-only": path.resolve("tests/server-only-stub.ts") },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
