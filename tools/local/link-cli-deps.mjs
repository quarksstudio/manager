import {
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  realpath,
  rm,
  symlink,
} from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const workspace = new Map();
const directories = (
  await readdir(join(root, 'packages'), { withFileTypes: true })
)
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(root, 'packages', entry.name));
directories.push(join(root, 'packages/installer/logger'));
for (const directory of directories) {
  try {
    const pkg = await readJson(join(directory, 'package.json'));
    workspace.set(pkg.name, { pkg, directory });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const cli = {
  pkg: await readJson(join(root, 'apps/cli/package.json')),
  directory: join(root, 'apps/cli'),
};
const required = new Map();
const external = new Set();
function visit({ pkg }) {
  for (const name of Object.keys({
    ...pkg.dependencies,
    ...pkg.peerDependencies,
  })) {
    if (!name.startsWith('@quarks.studio/')) {
      if (!pkg.peerDependenciesMeta?.[name]?.optional) external.add(name);
      continue;
    }
    if (required.has(name)) continue;
    const entry = workspace.get(name);
    if (!entry) throw new Error(`Unknown workspace dependency: ${name}`);
    required.set(name, entry);
    visit(entry);
  }
}
visit(cli);

// Resolve every dependency before touching links. Use source manifests so this
// step can run before the CLI bundle is created, without compiled libraries.
const targets = new Map();
for (const name of external) {
  let target;
  for (const directory of [
    root,
    cli.directory,
    ...Array.from(required.values(), (entry) => entry.directory),
  ]) {
    try {
      target = await realpath(join(directory, 'node_modules', name));
      break;
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
    }
  }
  if (!target)
    throw new Error(`Missing installed dependency: ${name}. Run pnpm install.`);
  targets.set(name, target);
}

for (const placement of [
  'dist/apps/cli/node_modules',
  'dist/apps/node_modules',
  'dist/packages/node_modules',
  'dist/node_modules',
]) {
  const directory = join(root, placement);
  const scope = join(directory, '@quarks.studio');
  await mkdir(scope, { recursive: true });
  // The bundled CLI no longer needs generated workspace package links.
  for (const entry of await readdir(scope, { withFileTypes: true })) {
    if (!entry.isSymbolicLink()) continue;
    const link = join(scope, entry.name);
    const target = resolve(scope, await readlink(link));
    if (target.startsWith(`${join(root, 'dist/packages')}/`)) await rm(link);
  }
  for (const [name, target] of targets) {
    const link = join(directory, name);
    await mkdir(dirname(link), { recursive: true });
    let existing;
    try {
      existing = await lstat(link);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (existing) {
      if (!existing.isSymbolicLink()) {
        throw new Error(
          `Cannot replace installed dependency directory: ${link}`,
        );
      }
      if (resolve(dirname(link), await readlink(link)) === target) continue;
      await rm(link);
    }
    await symlink(target, link, 'dir');
  }
}
console.log(
  `Linked ${external.size} external dependencies for the bundled CLI.`,
);
