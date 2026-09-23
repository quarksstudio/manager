import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const paths = JSON.parse(
  readFileSync(resolve(root, 'tsconfig.base.json'), 'utf8'),
).compilerOptions.paths;
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: Object.entries(paths)
      .filter(([name]) => !name.includes('*') && name !== 'ink')
      .map(([find, values]) => ({
        find,
        replacement: resolve(root, (values as string[])[0]),
      }))
      .sort((a, b) => b.find.length - a.find.length),
  },
  build: { outDir: '../../dist/apps/ui', emptyOutDir: true },
});
