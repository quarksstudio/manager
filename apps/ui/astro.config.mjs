import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadUiEnvironment } from './astro-env.mjs';
const root = resolve(import.meta.dirname, '../..');
const outDir = resolve(root, 'dist/apps/ui');
const paths = JSON.parse(
  readFileSync(resolve(root, 'tsconfig.base.json'), 'utf8'),
).compilerOptions.paths;
// Share the loaded dotenv values with browser islands and the SSR config adapter.
const { browserEnv, registryUrl, webOrigin } = loadUiEnvironment();
const publicOrigin = webOrigin ? new URL(webOrigin) : undefined;
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  security: {
    allowedDomains: publicOrigin
      ? [
          {
            hostname: publicOrigin.hostname,
            protocol: publicOrigin.protocol.slice(0, -1),
            port: publicOrigin.port,
          },
        ]
      : [{ hostname: 'localhost' }, { hostname: '127.0.0.1' }],
  },
  outDir,
  integrations: [react()],
  server: { host: '127.0.0.1', port: 4200 },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: Object.entries(paths)
        .filter(([name]) => !name.includes('*') && name !== 'ink')
        .filter(([name]) => !name.includes('/CLI'))
        .map(([find, values]) => ({
          find,
          replacement: resolve(root, values[0]),
        }))
        .sort((a, b) => b.find.length - a.find.length),
    },
    define: {
      'import.meta.env.QUARK_API': JSON.stringify(registryUrl),
      __QUARK_ENV__: JSON.stringify(browserEnv),
    },
  },
});
