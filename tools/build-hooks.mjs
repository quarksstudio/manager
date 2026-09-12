import { build } from 'esbuild';

// Shared hooks run in the browser only and must never load Ink. Third-party
// packages stay external so consumers resolve them through their own bundler.
await build({
  entryPoints: ['packages/ui/src/hooks/index.ts'],
  outfile: 'dist/packages/ui/src/hooks/index.mjs',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  packages: 'external',
  tsconfig: 'tsconfig.base.json',
  plugins: [
    {
      name: 'block-ink',
      setup(context) {
        context.onResolve({ filter: /^ink$/ }, () => {
          throw new Error('The hooks entry must not load Ink.');
        });
      },
    },
  ],
});
