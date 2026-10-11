import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Command } from 'commander';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const calls = [];
globalThis.quarkSearchTest = (skill, options) => calls.push({ skill, options });
after(() => {
  delete globalThis.quarkSearchTest;
});
const { outputFiles } = await build({
  absWorkingDir: root,
  entryPoints: ['apps/cli/src/commands.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  packages: 'external',
  plugins: [
    {
      name: 'command-test-actions',
      setup(builder) {
        builder.onResolve({ filter: /^commander$/ }, () => ({
          path: pathToFileURL(require.resolve('commander')).href,
          external: true,
        }));
        builder.onResolve({ filter: /^@quarks\.studio\// }, ({ path }) => ({
          path,
          namespace: 'actions',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'actions' }, ({ path }) => ({
          contents:
            path === '@quarks.studio/package-search/CLI'
              ? 'export const Search = (skill, options) => globalThis.quarkSearchTest(skill, options);'
              : 'const noop = () => {}; export const Add=noop, Remove=noop, Login=noop, Logout=noop, Me=noop, Info=noop, List=noop, Set=noop, Get=noop, Verify=noop, Clean=noop, Publish=noop, Test=noop, parseCertificationTier=noop;',
          loader: 'js',
        }));
      },
    },
  ],
});
const { registerCommands } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
);
function parse(args) {
  const program = new Command().exitOverride();
  registerCommands(program);
  program.parse(args, { from: 'user' });
  return calls.at(-1);
}
test('search accepts all filter and pagination options', () => {
  const call = parse([
    'search',
    'positional',
    '--query',
    'primary',
    '--search',
    'alias',
    '--author',
    'alice',
    '--name',
    'demo',
    '--summary',
    'test',
    '--tags',
    'e2e,test',
    '--match-mode',
    'all',
    '--exact',
    'false',
    '--limit',
    '10',
    '--cursor',
    'next',
  ]);
  assert.equal(call.skill, 'positional');
  assert.deepEqual(call.options, {
    models: ',',
    matchMode: 'all',
    exact: 'false',
    query: 'primary',
    search: 'alias',
    author: 'alice',
    name: 'demo',
    summary: 'test',
    tags: 'e2e,test',
    limit: '10',
    cursor: 'next',
  });
});
test('find allows filters without positional text and a bare exact flag', () => {
  const call = parse(['find', '--name', 'demo', '--exact']);
  assert.equal(call.skill, undefined);
  assert.equal(call.options.exact, true);
});
test('search with no arguments requests defaults and models remains accepted', () => {
  assert.equal(parse(['search']).skill, undefined);
  const call = parse(['search', '--models', 'openai']);
  assert.equal(call.options.models, 'openai');
  assert.equal(call.options.matchMode, 'any');
  assert.equal(call.options.exact, false);
});
