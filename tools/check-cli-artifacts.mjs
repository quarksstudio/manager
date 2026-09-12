import assert from 'node:assert/strict';
import {
  access,
  cp,
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const stage = await mkdtemp(join(tmpdir(), 'quark-cli-artifacts-'));
const names = [
  'installer',
  'registry',
  'config',
  'local-store',
  'publisher',
  'tester',
  'ui',
];
const commands = {
  installer: ['Add', 'Remove'],
  registry: ['Search', 'Info', 'Login', 'Logout', 'Me'],
  config: ['Get', 'Set', 'List'],
  'local-store': ['List', 'Verify', 'Clean'],
  publisher: ['Publish'],
  tester: ['Test'],
  ui: ['Screen', 'renderAction'],
};
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
function run(code) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', code],
    { cwd: stage, encoding: 'utf8' },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
try {
  const dirs = [
    ...names,
    'types',
    'use-storage',
    'manifest',
    'permissions',
    'targz',
  ];
  const external = new Set();
  for (const dir of dirs) {
    const source = join(root, 'packages', dir);
    const pkg = await readJson(join(source, 'package.json'));
    const target = join(stage, 'node_modules', pkg.name);
    await mkdir(resolve(target, '..'), { recursive: true });
    await cp(join(root, 'dist/packages', dir), target, { recursive: true });
    for (const name of Object.keys(pkg.dependencies ?? {}))
      if (!name.startsWith('@quark/')) external.add(name);
  }
  const cli = await readJson(join(root, 'dist/apps/cli/package.json'));
  for (const name of Object.keys(cli.dependencies ?? {}))
    if (!name.startsWith('@quark/')) external.add(name);
  for (const name of external) {
    let target;
    for (const candidate of [
      join(root, 'node_modules', name),
      ...dirs.map((dir) => join(root, 'packages', dir, 'node_modules', name)),
    ]) {
      try {
        target = await realpath(candidate);
        break;
      } catch {
        /* Try the next installed location. */
      }
    }
    assert.ok(target, `Missing installed dependency ${name}`);
    const link = join(stage, 'node_modules', name);
    await mkdir(resolve(link, '..'), { recursive: true });
    await symlink(target, link, 'dir');
  }
  run(`import Module from 'node:module';
    const load = Module._load;
    Module._load = function(id, ...args) { if (/^ink(\\/|$)/.test(id)) throw new Error('Business loaded Ink'); return load.call(this, id, ...args); };
    const req = Module.createRequire(process.cwd() + '/entry.cjs');
    for (const name of ${JSON.stringify(names.filter((name) => name !== 'ui'))}) req('@quark/' + name);
  `);
  run(`import Module from 'node:module';
    const load = Module._load;
    Module._load = function(id, ...args) { if (/^(react|ink)(\\/|$)/.test(id)) throw new Error('Publisher loaded UI'); return load.call(this, id, ...args); };
    const req = Module.createRequire(process.cwd() + '/entry.cjs');
    const { publishPackage } = req('@quark/publisher');
    const { configureRegistry } = req('@quark/registry/upload');
    configureRegistry('https://registry.test/api');
    if (typeof publishPackage !== 'function') throw new Error('Missing publisher');
  `);
  run(`for (const [name, commands] of Object.entries(${JSON.stringify(commands)})) {
    const api = await import('@quark/' + name + '/CLI');
    for (const command of commands) if (typeof api[command] !== 'function') throw new Error(name + ':' + command);
  }`);
  const webEntry = join(root, 'dist/packages/ui/src/web/index.mjs');
  const webStyles = join(root, 'dist/packages/ui/src/web/styles.css');
  const hooksEntry = join(root, 'dist/packages/ui/src/hooks/index.mjs');
  await access(webEntry);
  await access(webStyles);
  await access(hooksEntry);
  run(`import Module from 'node:module';
    const load = Module._load;
    Module._load = function(id, ...args) { if (/^ink(\\/|$)/.test(id)) throw new Error('Web bundle loaded Ink'); return load.call(this, id, ...args); };
    const web = await import('@quark/ui/web');
    for (const name of ['PackageDetails', 'PackageSidebar', 'usePackageDetailsView', 'renderMarkdown'])
      if (typeof web[name] !== 'function') throw new Error('ui:web missing ' + name);
  `);
  run(`const hooks = await import('@quark/ui/hooks');
    for (const name of ['usePackageDetailsView', 'usePackageDownload', 'usePackageMetadataEditor'])
      if (typeof hooks[name] !== 'function') throw new Error('ui:hooks missing ' + name);
  `);
  await cp(join(root, 'dist/apps/cli'), join(stage, 'app'), {
    recursive: true,
    filter: (source) => !source.includes('/node_modules'),
  });
  for (const args of [
    ['--help'],
    ['publish', '--help'],
    ['install', '--help'],
    ['auth', '--help'],
    ['config', '--help'],
    ['cache', '--help'],
    ['test', '--help'],
  ]) {
    const result = spawnSync(
      process.execPath,
      [join(stage, 'app/main.js'), ...args],
      { cwd: stage, encoding: 'utf8' },
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /Usage: quark/,
      JSON.stringify({ args, stderr: result.stderr, stdout: result.stdout }),
    );
  }
  console.log(
    'Compiled business APIs, all CLI exports and command help passed.',
  );
} finally {
  await rm(stage, { recursive: true, force: true });
}
