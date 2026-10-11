import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const { outputFiles } = await build({
  absWorkingDir: root,
  entryPoints: ['src/CLI/InfoContent.tsx'].map(
    (path) => `packages/distribution/${path}`,
  ),
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  packages: 'external',
  plugins: [
    {
      name: 'preview-imports',
      setup(builder) {
        builder.onResolve(
          { filter: /^(react(?:\/jsx-runtime)?|ink)$/ },
          ({ path }) => ({
            path: pathToFileURL(require.resolve(path)).href,
            external: true,
          }),
        );
        builder.onResolve({ filter: /^@quarks\.studio\/terminal-ui$/ }, () => ({
          path: `${root}packages/terminal-ui/src/CLI/components/layout/index.ts`,
        }));
      },
    },
  ],
});
const { InfoContent } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
);
const { default: React } = await import('react');
const { renderToString } = await import('ink');
const info = {
  summary: 'demo@2.0.0 | MIT | deps: 2 | versions: 2',
  description: 'A useful skill',
  heading: 'By latest version',
  tarball: `https://registry.test/${'a'.repeat(100)}/bundle`,
  shasum: 'b'.repeat(40),
  integrity: `sha512-${'c'.repeat(86)}==`,
  certification: 'Certified TIER_1',
  authors: ['alice', 'bob'],
  versions: ['2.0.0', '1.0.0'],
};

for (const columns of [120, 40]) {
  test(`renders the complete info panel at ${columns} columns`, () => {
    const output = renderToString(React.createElement(InfoContent, { info }), {
      columns,
    });
    assert.ok(output.includes('Info'));
    assert.ok(output.includes('╭'));
    assert.ok(output.includes('╰'));
    const content = output.replace(/[│╭╮╰╯─\s]/g, '');
    for (const value of [
      info.summary,
      info.tarball,
      info.shasum,
      info.integrity,
      info.certification,
      'Authors:',
      'alice',
      'bob',
      'Versions:',
      '2.0.0',
      '1.0.0',
    ]) {
      assert.ok(content.includes(value.replace(/\s/g, '')), `Missing ${value}`);
    }
    assert.ok(output.split('\n').every((line) => [...line].length <= columns));
  });
}
