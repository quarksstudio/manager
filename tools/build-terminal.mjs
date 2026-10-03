import { build } from 'esbuild';
await build({
  entryPoints: ['packages/terminal-ui/src/index.ts'],
  outfile: 'dist/packages/terminal-ui/src/index.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  jsx: 'automatic',
});
