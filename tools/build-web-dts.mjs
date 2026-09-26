import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tsc = resolve(root, 'node_modules/.bin/tsc');
const temp = resolve(root, 'dist/out-tsc-web-dts');
const source = resolve(temp, 'ui/src/web');
const target = resolve(root, 'dist/packages/ui/src/web');

// The web entry is compiled side by side with the rest of the workspace, then
// only its declarations are copied over the existing esbuild output. This
// replaces the build-lib (@nx/js:tsc) step without bundling anything.
await rm(temp, { recursive: true, force: true });
await mkdir(temp, { recursive: true });
execFileSync(
  tsc,
  [
    '-p',
    'packages/ui/tsconfig.lib.json',
    '--rootDir',
    'packages',
    '--outDir',
    'dist/out-tsc-web-dts',
    '--emitDeclarationOnly',
    '--declaration',
  ],
  { cwd: root, stdio: 'inherit' },
);

for (const relative of await readdir(target, { recursive: true })) {
  if (relative.endsWith('.d.ts')) await rm(resolve(target, relative));
}
await cp(source, target, { recursive: true });
await rm(temp, { recursive: true, force: true });
