import { build } from 'esbuild';
const name = process.argv[2];
if (!['commerce', 'distribution', 'package-search', 'registry', 'web-ui'].includes(name)) {
  throw new Error(`Unknown Web package: ${name}`);
}
const entry = name === 'web-ui' ? 'index.ts' : name === 'registry' ? 'web/index.tsx' : 'web/index.ts';
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
  plugins: [{
    name: 'web-boundaries',
    setup(context) {
      context.onResolve({ filter: /^ink(?:\/|$)/ }, () => {
        throw new Error('Web entry points cannot load Ink.');
      });
      context.onResolve({ filter: /^@quarks\.studio\// }, ({ path }) => ({ path, external: true }));
      // Providers must be the same instance as the published /react entry.
      context.onResolve({ filter: /^\.\.\/react$/ }, ({ resolveDir }) => {
        if (resolveDir.endsWith(`/packages/${name}/src/web`)) {
          return { path: `@quarks.studio/${name}/react`, external: true };
        }
      });
    },
  }],
});
