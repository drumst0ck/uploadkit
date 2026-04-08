import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/styles.css'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  external: ['react', 'react-dom', '@uploadkit/core', '@uploadkit/next'],
});
