import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const styleSrc = join(rootDir, 'src/style.css');
const styleDest = join(rootDir, 'dist/style.css');

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'adapters/nanostores': 'src/adapters/nanostores.ts',
    'adapters/spred': 'src/adapters/spred.ts'
  },
  format: ['esm'],
  dts: true,
  minify: "terser",
  sourcemap: true,
  splitting: false,
  clean: true,
  treeshake: true,
  bundle: true,
  outDir: 'dist',
  target: 'es2020',
  tsconfig: 'tsconfig.build.json',
  onSuccess: async () => {
    mkdirSync(dirname(styleDest), { recursive: true });
    copyFileSync(styleSrc, styleDest);
  }
});
