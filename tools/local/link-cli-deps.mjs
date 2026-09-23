import { mkdir, readdir, readFile, realpath, rm, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const target = join(root, 'dist/apps/cli/node_modules');
const external = new Set();

const candidates = [
  ...(await readdir(join(root, 'dist/packages'))).filter((name) =>
    existsSync(join(root, 'dist/packages', name, 'package.json')),
  ),
];

for (const dir of candidates) {
  const pkg = JSON.parse(
    await readFile(join(root, 'dist/packages', dir, 'package.json'), 'utf8'),
  );
  for (const dep of Object.keys(pkg.dependencies ?? {}))
    if (!dep.startsWith('@quarks.studio/')) external.add(dep);
}

console.log(
  `Linked ${candidates.length} @quarks.studio packages + ${external.size} external deps`,
);

for (const placement of [
  join(root, 'dist/apps/cli/node_modules'),
  join(root, 'dist/apps/node_modules'),
  join(root, 'dist/packages/node_modules'),
  join(root, 'dist/node_modules'),
]) {
  await mkdir(join(placement, '@quarks.studio'), { recursive: true });
  for (const dir of candidates) {
    const pkg = JSON.parse(
      await readFile(join(root, 'dist/packages', dir, 'package.json'), 'utf8'),
    );
    const link = join(
      placement,
      '@quarks.studio',
      pkg.name.replace('@quarks.studio/', ''),
    );
    try {
      await rm(link, { recursive: true, force: true });
    } catch {}
    await symlink(join(root, 'dist/packages', dir), link, 'dir');
  }
  for (const name of external) {
    const link = join(placement, name);
    if (existsSync(link)) continue;
    let resolved;
    for (const c of [
      join(root, 'node_modules', name),
      ...candidates.map((dir) =>
        join(root, 'packages', dir, 'node_modules', name),
      ),
    ]) {
      try {
        resolved = await realpath(c);
        break;
      } catch {}
    }
    if (!resolved) continue;
    const scope = name.indexOf('/');
    await mkdir(join(placement, scope === -1 ? '.' : name.slice(0, scope)), {
      recursive: true,
    });
    await symlink(resolved, link, 'dir');
  }
}