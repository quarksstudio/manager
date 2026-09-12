import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
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
await copyFile(
  resolve('packages/ui/src/web/styles.css'),
  resolve('dist/packages/ui/src/web/styles.css'),
);
