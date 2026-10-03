import { build } from 'esbuild';
import { resolve } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const entry = 'tools/build-web-antd-css.entry.tsx';
// A throwaway esbuild intermediate, not a source file: the entry renders the
// components to harvest antd's CSS, and the bundle is only needed for the
// duration of that one import. Under `dist/` so it stays out of the tree.
const outfile = 'dist/tools/antd-css.bundle.mjs';
await mkdir('dist/tools', { recursive: true });
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  jsx: 'automatic',
  format: 'esm',
  platform: 'node',
  target: 'node20',
  packages: 'bundle',
  nodePaths: [
    resolve('packages/web-ui/node_modules'),
    resolve('apps/ui/node_modules'),
  ],
  external: ['react', 'react-dom', 'react/jsx-runtime'],
});
// The bundle keeps a few CJS `require('react'|'react-dom')` call sites that
// esbuild cannot statically inline; resolve them through Node's real loader.
globalThis.require = createRequire(pathToFileURL(outfile));
const result = await import(pathToFileURL(outfile).href);
if (typeof result.default !== 'undefined') {
  await result.default;
}

// `extractStyle` emits one long line. The committed stylesheet is the formatted
// one, so format on the way out: regenerating must not show up as a 20k-line
// whitespace diff, and `format:check` has to keep passing.
const { format, resolveConfig } = await import('prettier');
const target = 'apps/ui/public/antd.css';
const stylesheet = await readFile(target, 'utf8');
const formatted = await format(stylesheet, {
  ...(await resolveConfig(target)),
  filepath: target,
  parser: 'css',
});
if (formatted !== stylesheet) await writeFile(target, formatted);
