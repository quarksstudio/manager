import { cp, mkdir, mkdtemp, realpath, rm, symlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const names = [
  'logger',
  'types',
  'use-storage',
  'manifest',
  'permissions',
  'targz',
  'installer',
  'registry',
  'config',
  'local-store',
  'publisher',
  'tester',
  'ui',
];

const stage = await mkdtemp(join(tmpdir(), 'quark-run-cli-'));
const external = new Set();
for (const dir of names) {
  const pkg = JSON.parse(
    await readFile(join(root, 'packages', dir, 'package.json'), 'utf8'),
  );
  await cp(
    join(root, 'dist/packages', dir),
    join(stage, 'node_modules', pkg.name),
    { recursive: true },
  );
  for (const dep of Object.keys(pkg.dependencies ?? {}))
    if (!dep.startsWith('@quarks.studio/')) external.add(dep);
}
const cliPkg = JSON.parse(
  await readFile(join(root, 'dist/apps/cli/package.json'), 'utf8'),
);
for (const dep of Object.keys(cliPkg.dependencies ?? {}))
  if (!dep.startsWith('@quarks.studio/')) external.add(dep);
for (const name of external) {
  let target;
  const candidates = [
    join(root, 'node_modules', name),
    ...names.map((dir) =>
      join(root, 'packages', dir, 'node_modules', name),
    ),
  ];
  for (const candidate of candidates) {
    try {
      target = await realpath(candidate);
      break;
    } catch {}
  }
  if (!target) continue;
  const scope = name.indexOf('/');
  await mkdir(
    join(
      stage,
      'node_modules',
      scope === -1 ? '.' : name.slice(0, scope),
    ),
    { recursive: true },
  );
  try {
    await symlink(target, join(stage, 'node_modules', name), 'dir');
  } catch {}
}
await cp(join(root, 'dist/apps/cli'), join(stage, 'app'), {
  recursive: true,
  filter: (source) => !source.includes('/node_modules'),
});

const spawn = spawnSync(
  process.execPath,
  ['--disable-warning=ExperimentalWarning', join(stage, 'app/main.js'), ...process.argv.slice(2)],
  { cwd: stage, stdio: 'inherit' },
);
await rm(stage, { recursive: true, force: true });
process.exit(spawn.status ?? 1);