import { build } from 'esbuild';
import { resolve } from 'node:path';
const name = process.argv[2];
if (
  ![
    'identity',
    'commerce',
    'distribution',
    'package-search',
    'web-ui',
  ].includes(name)
) {
  throw new Error(`Unknown Web package: ${name}`);
}
const entry = name === 'web-ui' ? 'index.ts' : 'web/index.ts';
await build({
  entryPoints: [`packages/${name}/src/${entry}`],
  outfile: `dist/packages/${name}/src/${name === 'web-ui' ? 'index' : 'web/index'}.mjs`,
  bundle: true,
  jsx: 'automatic',
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  packages: 'external',
  tsconfig: 'tsconfig.base.json',
  plugins: [
    {
      name: 'web-boundaries',
      setup(context) {
        context.onResolve({ filter: /^ink(?:\/|$)/ }, () => {
          throw new Error('Web entry points cannot load Ink.');
        });
        context.onResolve({ filter: /^@quarks\.studio\// }, ({ path }) => ({
          path,
          external: true,
        }));
        // Keep providers and core APIs shared with the published entries.
        context.onResolve({ filter: /^\./ }, ({ path, resolveDir }) => {
          const target = resolve(resolveDir, path);
          for (const entry of ['index', 'hooks', 'presentation']) {
            const source = resolve(`packages/${name}/src/${entry}`);
            if (
              target === source ||
              target === resolve(source, 'index') ||
              (entry !== 'index' && target.startsWith(`${source}/`))
            ) {
              return {
                path: `@quarks.studio/${name}${entry === 'index' ? '' : `/${entry}`}`,
                external: true,
              };
            }
          }
        });
      },
    },
  ],
});
