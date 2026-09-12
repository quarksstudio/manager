import { build } from 'esbuild';
import { resolve } from 'node:path';

const name = process.argv[2];
if (
  ![
    'ui',
    'config',
    'installer',
    'registry',
    'local-store',
    'publisher',
    'tester',
  ].includes(name)
) {
  throw new Error(`Unknown CLI package: ${name}`);
}

// Business APIs remain CommonJS. Ink's asynchronous ESM graph is only loaded
// through the explicit CLI entrypoint. Keep the owning business module shared.
await build({
  entryPoints: [`packages/${name}/src/CLI/index.ts`],
  outfile: `dist/packages/${name}/src/CLI/index.mjs`,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  tsconfig: 'tsconfig.base.json',
  plugins: [
    {
      name: 'owning-business-api',
      setup(context) {
        context.onResolve({ filter: /^\.\.\/index$/ }, (args) => {
          if (
            resolve(args.resolveDir) === resolve(`packages/${name}/src/CLI`)
          ) {
            return { path: '../index.js', external: true };
          }
        });
      },
    },
  ],
});
