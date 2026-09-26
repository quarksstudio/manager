// Stages the Astro build + Electron shell into apps/.desktop-app so
// electron-builder can package the ClientRender output from a single folder.
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const stage = path.resolve(app, '.desktop-app');
const dist = path.resolve(app, '../../dist/apps/ui');

await rm(stage, { recursive: true, force: true });
await mkdir(path.join(stage, 'dist/apps/ui'), { recursive: true });
await cp(dist, path.join(stage, 'dist/apps/ui'), { recursive: true });
await cp(path.join(app, 'desktop'), path.join(stage, 'desktop'), {
  recursive: true,
});
await writeFile(
  path.join(stage, 'package.json'),
  JSON.stringify(
    {
      name: '@quarks.studio/ui-app-desktop',
      version: '0.1.0',
      main: 'desktop/main.cjs',
    },
    null,
    2,
  ),
);
console.log(`Staged desktop app at ${stage}`);