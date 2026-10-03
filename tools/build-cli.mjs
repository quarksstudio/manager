import { build } from 'esbuild';
import { resolve } from 'node:path';

const name = process.argv[2];
if (
  ![
    'config',
    'installer',
    'identity',
    'distribution',
    'package-search',
    'storage',
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
  jsx: 'automatic',
  platform: 'node',
  format: 'esm',
  packages: 'external',
  tsconfig: 'tsconfig.base.json',
  plugins: [
    {
      name: 'owning-business-api',
      setup(context) {
        context.onResolve({ filter: /^@quarks\.studio\// }, ({ path }) => ({
          path,
          external: true,
        }));
        context.onResolve(
          {
            filter:
              /^\.\.\/(index|hooks|presentation|installations|presentation\/configured-services)$/,
          },
          (args) => {
            if (
              resolve(args.resolveDir) === resolve(`packages/${name}/src/CLI`)
            ) {
              const entry = ['../hooks', '../presentation'].includes(args.path)
                ? `${args.path}/index.js`
                : `${args.path}.js`;
              return { path: entry, external: true };
            }
          },
        );
      },
    },
  ],
});
