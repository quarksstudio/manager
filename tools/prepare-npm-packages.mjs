import {
  cp,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

const workspace = process.cwd();
const sourceGroups = ['packages', 'apps'];
const distRoot = path.join(workspace, 'dist');

const packages = new Map();
for (const group of sourceGroups) {
  const sourceRoot = path.join(workspace, group);
  for (const directory of (await readdir(sourceRoot)).sort()) {
    const manifestFile = path.join(sourceRoot, directory, 'package.json');
    try {
      const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
      if (!manifest.name || !manifest.version)
        throw new Error(`${manifestFile} requires name and version`);
      if (packages.has(manifest.name))
        throw new Error(`Duplicate package name: ${manifest.name}`);
      packages.set(manifest.name, { group, directory, manifest });
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

const order = topologicalOrder(packages);
for (const name of order) {
  const entry = packages.get(name);
  const output = path.join(distRoot, entry.group, entry.directory);
  const expectedOutput =
    entry.group === 'apps'
      ? (entry.manifest.main ?? './index.html')
      : (entry.manifest.main ?? './index.js');
  if (!(await exists(path.join(output, expectedOutput))))
    throw new Error(
      `Missing build output for ${name}: ${output}/${expectedOutput}`,
    );
  const sourceReadme = path.join(
    workspace,
    entry.group,
    entry.directory,
    'README.md',
  );
  if (await exists(sourceReadme))
    await cp(sourceReadme, path.join(output, 'README.md'));
  const manifest = publishManifest(entry.manifest, packages, entry.group);
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}
await mkdir(distRoot, { recursive: true });
await writeFile(
  path.join(distRoot, 'publish-order.json'),
  `${JSON.stringify(order, null, 2)}\n`,
);
console.log(`Prepared ${order.length} packages: ${order.join(', ')}`);

function publishManifest(source, allPackages, group) {
  const manifest = structuredClone(source);
  delete manifest.private;
  manifest.license ??= 'MIT';
  if (group === 'packages') {
    manifest.main ??= './index.js';
    manifest.types ??= './index.d.ts';
    manifest.exports ??= {
      '.': {
        types: manifest.types,
        require: manifest.main,
        default: manifest.main,
      },
    };
  } else if (manifest.main) {
    manifest.main = source.main;
  }
  if (manifest.bin)
    for (const [name, file] of Object.entries(manifest.bin))
      manifest.bin[name] = file;
  manifest.files ??=
    group === 'packages'
      ? ['**/*.js', '**/*.d.ts', 'README.md']
      : ['**/*', 'README.md'];
  manifest.publishConfig = {
    ...(manifest.publishConfig ?? {}),
    access: 'public',
  };
  for (const section of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    for (const [dependency, range] of Object.entries(manifest[section] ?? {})) {
      if (!String(range).startsWith('workspace:')) continue;
      const local = allPackages.get(dependency);
      if (!local)
        throw new Error(
          `${manifest.name} references unknown workspace package ${dependency}`,
        );
      manifest[section][dependency] = `^${local.manifest.version}`;
    }
  }
  return manifest;
}

function topologicalOrder(allPackages) {
  const visiting = new Set();
  const visited = new Set();
  const result = [];
  const visit = (name) => {
    if (visited.has(name)) return;
    if (visiting.has(name))
      throw new Error(`Workspace dependency cycle involving ${name}`);
    visiting.add(name);
    const manifest = allPackages.get(name).manifest;
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
    };
    for (const dependency of Object.keys(dependencies).sort())
      if (allPackages.has(dependency)) visit(dependency);
    visiting.delete(name);
    visited.add(name);
    result.push(name);
  };
  for (const name of [...allPackages.keys()].sort()) visit(name);
  return result;
}

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}
