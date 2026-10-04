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
const bundledStage = await mkdtemp(join(tmpdir(), 'quark-cli-bundle-'));
const names = [
  'installer',
  'runtime',
  'registry',
  'identity',
  'notifications',
  'distribution',
  'commerce',
  'certification',
  'package-search',
  'terminal-ui',
  'web-ui',
  'config',
  'storage',
  'publisher',
  'tester',
];
const commands = {
  installer: ['Add', 'Remove'],
  identity: ['Login', 'Logout', 'Me'],
  distribution: ['Info'],
  'package-search': ['Search'],
  config: ['Get', 'Set', 'List'],
  storage: ['List', 'Verify', 'Clean'],
  publisher: ['Publish'],
  tester: ['Test'],
};
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
function run(code, env) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', code],
    { cwd: stage, encoding: 'utf8', env: { ...process.env, ...env } },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
try {
  const dirs = [
    ...new Set(names),
    'logger',
    'domain-kernel',
    'manifest',
    'permissions',
    'targz',
  ];
  const external = new Set();
  for (const dir of dirs) {
    const source = join(
      root,
      'packages',
      dir === 'logger' ? 'installer/logger' : dir,
    );
    const pkg = await readJson(join(source, 'package.json'));
    const target = join(stage, 'node_modules', pkg.name);
    await mkdir(resolve(target, '..'), { recursive: true });
    await cp(join(root, 'dist/packages', dir), target, { recursive: true });
    if (
      [
        'registry',
        'identity',
        'notifications',
        'distribution',
        'commerce',
        'certification',
        'package-search',
        'terminal-ui',
        'web-ui',
      ].includes(dir)
    ) {
      for (const entry of Object.values(pkg.exports ?? {})) {
        if (typeof entry === 'object' && entry.types)
          await access(join(target, entry.types));
      }
    }

    for (const name of Object.keys(pkg.dependencies ?? {}))
      if (!name.startsWith('@quarks.studio/')) external.add(name);
  }
  const cli = await readJson(join(root, 'dist/apps/cli/package.json'));
  for (const name of Object.keys(cli.dependencies ?? {}))
    if (!name.startsWith('@quarks.studio/')) external.add(name);
  for (const name of external) {
    let target;
    for (const candidate of [
      join(root, 'node_modules', name),
      ...dirs.map((dir) =>
        join(
          root,
          'packages',
          dir === 'logger' ? 'installer/logger' : dir,
          'node_modules',
          name,
        ),
      ),
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
    for (const name of ${JSON.stringify(names.filter((name) => !['terminal-ui'].includes(name)))}) req('@quarks.studio/' + name);
  `);
  run(`import Module from 'node:module';
    const load = Module._load;
    Module._load = function(id, ...args) { if (/^(react|ink)(\\/|$)/.test(id)) throw new Error('Functional API loaded UI'); return load.call(this, id, ...args); };
    const req = Module.createRequire(process.cwd() + '/entry.cjs');
    for (const name of ['identity', 'distribution', 'commerce', 'certification', 'package-search']) req('@quarks.studio/' + name);
    req('@quarks.studio/registry/http');
    req('@quarks.studio/publisher/upload');
  `);
  run(
    `import Module from 'node:module';
    const load = Module._load;
    Module._load = function(id, ...args) { if (/^(react|ink)(\\/|$)/.test(id)) throw new Error('Publisher loaded UI'); return load.call(this, id, ...args); };
    const req = Module.createRequire(process.cwd() + '/entry.cjs');
    const { publishPackage } = req('@quarks.studio/publisher');
    const { createGlobalContext } = req('@quarks.studio/config/http');
    const context = await createGlobalContext({ skipAuth: true });
    if (context.baseUrl !== 'https://registry.test/api') throw new Error('Registry endpoint did not come from the environment');
    if (typeof publishPackage !== 'function') throw new Error('Missing publisher');
  `,
    { QUARK_REGISTRY_URL: 'https://registry.test/api' },
  );
  run(`import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    const require = createRequire(process.cwd() + '/entry.cjs');
    const { DomainError } = require('@quarks.studio/domain-kernel');
    const { SkillCoordinate, SkillInstallation } = require('@quarks.studio/installer');
    const { LocalSkillInstallation } = require('@quarks.studio/storage/installations');
    const { SkillExecution } = require('@quarks.studio/runtime');
    const cases = [
      [() => SkillCoordinate.create('../bad', '1.0.0'), 'installation.invalid_name', 'Invalid skill name: ../bad'],
      [() => SkillCoordinate.create('demo', 'bad'), 'installation.invalid_version', 'Invalid semantic version: bad'],
      [() => new SkillInstallation(SkillCoordinate.create('demo', '1.0.0')).complete(), 'installation.invalid_transition', 'Cannot transition requested to installed'],
      [() => LocalSkillInstallation.restore({name: '', version: '', path: ''}), 'local_store.invalid_installation', 'Invalid local skill installation'],
      [() => new SkillExecution('node', '', [], '.', {}), 'execution.missing_entrypoint', 'Entrypoint is required'],
    ];
    for (const [run, code, message] of cases) assert.throws(run, error => error instanceof DomainError && error.name === 'DomainError' && error.code === code && error.message === message);
    const kernel = require('./node_modules/@quarks.studio/domain-kernel/package.json');
    assert.deepEqual(Object.keys(kernel.dependencies ?? {}), []);
  `);
  run(`for (const [name, commands] of Object.entries(${JSON.stringify(commands)})) {
    const api = await import('@quarks.studio/' + name + '/CLI');
    for (const command of commands) if (typeof api[command] !== 'function') throw new Error(name + ':' + command);
  }`);
  run(`import Module from 'node:module';
    const load = Module._load;
    Module._load = function(id, ...args) { if (/^ink(\\/|$)/.test(id)) throw new Error('Functional Web loaded Ink'); return load.call(this, id, ...args); };
    for (const [owner, names] of Object.entries({
      identity: ['UserAvatarMenu'],
      notifications: ['NotificationHost'],
      commerce: ['BillingBoundary', 'PricingBoundary', 'PaymentHistory'],
      distribution: ['PackagesBoundary', 'PackageDetails'],
      'package-search': ['ConfiguredLandingBoundary', 'landingTiers'],
    })) {
      const api = await import('@quarks.studio/' + owner + '/web');
      for (const name of names) if (typeof api[name] !== 'function') throw new Error(owner + ':web missing ' + name);
    }
    const shared = await import('@quarks.studio/web-ui');
    if (typeof shared.QuarkTheme !== 'function') throw new Error('Missing shared theme');
  `);
  await access(join(root, 'dist/packages/web-ui/src/styles.css'));
  run(`for (const [owner, hook, provider] of [
      ['identity', 'useAuthLogin', 'IdentityProvider'],
      ['commerce', 'usePayments', 'CommerceProvider'],
      ['distribution', 'useFetchPackage', 'DistributionProvider'],
      ['package-search', 'useSearchPackages', 'PackageSearchProvider'],
      ['certification', 'useAuditCertification', 'CertificationProvider'],
    ]) {
      const hooks = await import('@quarks.studio/' + owner + '/hooks');
      const presentation = await import('@quarks.studio/' + owner + '/presentation');
      if (typeof hooks[hook] !== 'function') throw new Error(owner + ':hooks missing ' + hook);
      if (typeof presentation[provider] !== 'function') throw new Error(owner + ':presentation missing ' + provider);
      try {
        await import('@quarks.studio/' + owner + '/react');
        throw new Error(owner + ': obsolete entry is still exported');
      } catch (error) {
        if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
      }
    }
    const notifications = await import('@quarks.studio/notifications/hooks');
    if (typeof notifications.useNotifications !== 'function') throw new Error('Missing notifications hook');
    const hooks = await import('@quarks.studio/distribution/hooks');
    for (const name of ['usePackageDetailsView', 'usePackageDownload', 'usePackageMetadataEditor', 'useReadmeCached'])
      if (typeof hooks[name] !== 'function') throw new Error('distribution:hooks missing ' + name);
    const query = await import('@quarks.studio/storage/query');
    if (typeof query.useCachedQuery !== 'function') throw new Error('Missing cache query');
    const shared = await import('@quarks.studio/web-ui');
    for (const name of ['SiteNavbar', 'SiteFooter', 'cn']) if (typeof shared[name] !== 'function') throw new Error('web-ui missing ' + name);
  `);
  for (const field of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    assert.ok(
      !Object.keys(cli[field] ?? {}).some((name) =>
        name.startsWith('@quarks.studio/'),
      ),
      `CLI manifest contains workspace dependencies: ${field}`,
    );
  }
  const metadata = await readJson(join(root, 'dist/apps/cli/meta.json'));
  for (const output of Object.values(metadata.outputs)) {
    assert.ok(
      !output.imports.some(
        (item) => item.external && item.path.startsWith('@quarks.studio/'),
      ),
      'CLI bundle contains workspace imports',
    );
  }
  for (const name of Object.keys(cli.dependencies ?? {})) {
    const target = await realpath(join(stage, 'node_modules', name));
    const link = join(bundledStage, 'node_modules', name);
    await mkdir(resolve(link, '..'), { recursive: true });
    await symlink(target, link, 'dir');
  }
  await cp(join(root, 'dist/apps/cli'), join(bundledStage, 'app'), {
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
      [join(bundledStage, 'app/main.js'), ...args],
      { cwd: bundledStage, encoding: 'utf8' },
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
    'Compiled business APIs, all CLI exports and isolated bundled CLI commands passed.',
  );
} finally {
  await Promise.all([
    rm(stage, { recursive: true, force: true }),
    rm(bundledStage, { recursive: true, force: true }),
  ]);
}
