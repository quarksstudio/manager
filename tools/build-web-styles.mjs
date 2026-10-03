import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const outfile = 'dist/packages/web-ui/src/styles.css';
await mkdir(dirname(outfile), { recursive: true });
const { build: buildStyles } = await import('vite');
const { default: tailwind } = await import('@tailwindcss/vite');
const result = await buildStyles({
  configFile: false,
  plugins: [tailwind()],
  build: {
    write: false,
    rollupOptions: { input: resolve('packages/web-ui/src/styles.css') },
  },
});
const bundles = Array.isArray(result) ? result : [result];
const css = bundles
  .flatMap((bundle) => bundle.output)
  .filter((asset) => asset.type === 'asset' && asset.fileName.endsWith('.css'))
  .map((asset) => asset.source)
  .join('\n');
if (!css) throw new Error('Missing compiled Web styles');
await writeFile(resolve('dist/packages/web-ui/src/styles.css'), css);
