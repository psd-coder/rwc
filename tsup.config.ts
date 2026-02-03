import { defineConfig } from 'tsup';

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
  tsconfig: 'tsconfig.build.json'
});
