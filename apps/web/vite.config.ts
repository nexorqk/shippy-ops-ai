import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shippy-ops-ai/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@shippy-ops-ai/ui": path.resolve(__dirname, "../../packages/ui/src/index.tsx")
    }
  },
  server: {
    port: 3000
  }
});
