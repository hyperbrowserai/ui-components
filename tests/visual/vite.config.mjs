import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const visualRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "harness",
);
const repoRoot = path.resolve(visualRoot, "..", "..");

export default defineConfig({
  root: visualRoot,
  publicDir: false,
  plugins: [react()],
  server: {
    fs: {
      allow: [repoRoot],
    },
    host: process.env.HOST ?? "localhost",
    port: Number.parseInt(process.env.PORT ?? "3000", 10),
  },
});
