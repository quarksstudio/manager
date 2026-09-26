import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const entry = 'packages/ui/tools/build-web-antd-css.entry.tsx';
const outfile = 'packages/ui/tools/.antd-css.bundle.mjs';
await mkdir('packages/ui/tools', { recursive: true });
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  jsx: 'automatic',
  format: 'esm',
  platform: 'node',
  target: 'node20',
  packages: 'bundle',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
});
// The bundle keeps a few CJS `require('react'|'react-dom')` call sites that
// esbuild cannot statically inline; resolve them through Node's real loader.
globalThis.require = createRequire(pathToFileURL(outfile));
const result = await import(pathToFileURL(outfile).href);
if (typeof result.default !== 'undefined') {
  await result.default;
}
