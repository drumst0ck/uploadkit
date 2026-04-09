import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/styles.css', 'src/tailwind.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  external: ['react', 'react-dom', '@uploadkitdev/core', '@uploadkitdev/next'],
});
