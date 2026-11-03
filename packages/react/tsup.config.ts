import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/helpers.ts'],
    format: ['esm', 'cjs'], dts: true, clean: false, splitting: true,
    banner: { js: '"use client";' },
    external: ['react', 'react-dom', '@uploadkitdev/core'],
  },
  {
    entry: ['src/styles.css', 'src/tailwind.ts'],
    format: ['esm', 'cjs'], dts: true, clean: false,
  },
]);
