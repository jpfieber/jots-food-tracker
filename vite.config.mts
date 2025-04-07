import { defineConfig } from 'vite';
import copy from 'rollup-plugin-copy';

export default defineConfig({
  build: {
    lib: {
      entry: './src/main.ts', // Path to your main plugin file
      formats: ['cjs'], // CommonJS format for Obsidian plugins
      fileName: () => 'main.js', // Output file name
    },
    rollupOptions: {
      external: ['obsidian'], // Mark 'obsidian' as an external dependency
    },
    outDir: 'dist', // Output directory
    emptyOutDir: true, // Clean the output directory before building
  },
  plugins: [
    copy({
      targets: [
        { src: 'src/styles.css', dest: 'dist' }, // Copy styles.css to dist
      ],
      hook: 'writeBundle', // Ensure the copy happens after the bundle is written
    }),
  ],
});