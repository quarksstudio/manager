import { build } from 'esbuild';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const entry = 'packages/ui/src/web/index.ts';
const outfile = 'dist/packages/ui/src/web/index.mjs';

// The web entry is browser-only and must never load Ink. Third-party packages
// stay external so consumers resolve them through their own bundler; Ink is
// never part of this dependency graph.
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  jsx: 'automatic',
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  packages: 'external',
  tsconfig: 'tsconfig.base.json',
  plugins: [
    {
      name: 'block-ink',
      setup(context) {
        context.onResolve({ filter: /^ink$/ }, () => {
          throw new Error('The web entry must not load Ink.');
        });
      },
    },
  ],
});

await mkdir(dirname(outfile), { recursive: true });
const { build: buildStyles } = await import('vite');
const { default: tailwind } = await import('@tailwindcss/vite');
const result = await buildStyles({
  configFile: false,
  plugins: [tailwind()],
  build: {
    write: false,
    rollupOptions: { input: resolve('packages/ui/src/web/styles.css') },
  },
});
const bundles = Array.isArray(result) ? result : [result];
const css = bundles
  .flatMap((bundle) => bundle.output)
  .filter((asset) => asset.type === 'asset' && asset.fileName.endsWith('.css'))
  .map((asset) => asset.source)
  .join('\n');
if (!css) throw new Error('Missing compiled UI styles');
await writeFile(resolve('dist/packages/ui/src/web/styles.css'), css);
