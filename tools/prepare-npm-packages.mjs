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
  const expected = expectedOutputFor(entry);
  if (expected.single && !(await exists(path.join(output, expected.single))))
    throw new Error(
      `Missing build output for ${name}: ${output}/${expected.single}`,
    );
  for (const target of expected.exports ?? [])
    if (!(await exists(path.join(output, target))))
      throw new Error(`Missing build output for ${name}: ${output}/${target}`);
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
  manifest.repository ??= {
    type: 'git',
    url: 'https://github.com/quarksstudio/manager',
  };
  if (group === 'packages') {
    if (!manifest.exports) {
      manifest.main ??= './index.js';
      manifest.types ??= './index.d.ts';
      manifest.exports ??= {
        '.': {
          types: manifest.types,
          require: manifest.main,
          default: manifest.main,
        },
      };
    }
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
  const localDependencies = (name) => {
    const manifest = allPackages.get(name).manifest;
    return Object.keys({
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
    }).filter((dependency) => allPackages.has(dependency));
  };
  const state = new Map();
  const stack = [];
  const cycles = new Set();
  const result = [];
  const visit = (name) => {
    if (state.get(name) === 2) return;
    if (state.get(name) === 1) {
      for (let i = stack.indexOf(name); i < stack.length; i++)
        cycles.add(stack[i]);
      return;
    }
    state.set(name, 1);
    stack.push(name);
    for (const dependency of [...localDependencies(name)].sort())
      visit(dependency);
    stack.pop();
    state.set(name, 2);
    result.push(name);
  };
  for (const name of [...allPackages.keys()].sort()) visit(name);
  if (cycles.size > 0)
    console.warn(
      `Breaking workspace dependency cycle(s): ${[...cycles].sort().join(', ')} (npm installs cyclic packages fine)`,
    );
  return result;
}

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

function expectedOutputFor(entry) {
  const { manifest } = entry;
  if (entry.group === 'apps')
    return { single: manifest.main ?? './index.html' };
  if (manifest.main) return { single: manifest.main };
  if (manifest.exports)
    return { exports: collectExportTargets(manifest.exports) };
  return { single: './index.js' };
}

function collectExportTargets(exports) {
  if (typeof exports === 'string') return [exports];
  const targets = [];
  for (const value of Object.values(exports)) {
    if (typeof value === 'string') targets.push(value);
    else targets.push(...collectExportTargets(value));
  }
  return targets;
}
