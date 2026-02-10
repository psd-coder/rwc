import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(projectRoot, "../..");

export default defineConfig({
  vite: {
    server: {
      fs: {
        allow: [repoRoot],
      },
    },
  },
});
