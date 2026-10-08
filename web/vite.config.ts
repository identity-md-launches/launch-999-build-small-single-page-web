import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Explicitly avoid inheriting PostCSS configuration from the host filesystem.
  css: { postcss: { plugins: [] } },
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2020' },
});
